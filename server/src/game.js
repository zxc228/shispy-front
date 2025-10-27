import { randomInt } from 'crypto'
import axios from 'axios'

export class GameManager {
  constructor(io, nsp) {
    this.io = io
    this.nsp = nsp
    /** @type {Map<string, Game>} */
    this.games = new Map()
  }

  get(gameId) {
    if (!this.games.has(gameId)) {
      this.games.set(gameId, new Game(this.nsp, gameId, this))
    }
    return this.games.get(gameId)
  }

  delete(gameId) {
    const g = this.games.get(gameId)
    if (g) {
      g.dispose()
      this.games.delete(gameId)
    }
  }
}

class Game {
  constructor(nsp, gameId, manager) {
    this.nsp = nsp
    this.gameId = String(gameId)
    this.room = this.roomName(gameId)
    this.manager = manager
    this.phase = 'waiting_players'
    this.players = {
      a: { sid: null, secret: null, timeLeft: 25000, tuid: null, token: null },
      b: { sid: null, secret: null, timeLeft: 25000, tuid: null, token: null },
    }
    this.turn = null // 'a' | 'b'
    this.timer = null
    this.placingTimer = null // Timer for placing phase
    this.placingTimeLeft = 20000 // 20 seconds for placing phase
    this.placingTimerStarted = false // Track if placing timer has started
    this.version = 0
    this.moveIds = { a: new Set(), b: new Set() }
  }

  roomName(id) { return `game:${id}` }

  dispose() {
    this.clearTimer()
    this.clearPlacingTimer()
    // Clear any disconnect timeouts
    if (this.disconnectTimeouts) {
      for (const role in this.disconnectTimeouts) {
        clearTimeout(this.disconnectTimeouts[role])
      }
      this.disconnectTimeouts = {}
    }
  }

  addPlayer(socket) {
    // If game is already finished, don't allow rejoins
    if (this.phase === 'finished') {
      socket.emit('error', { code: 'GAME_FINISHED', message: 'This game has already ended' })
      return null
    }

    // Read token and tuid from socket
    const token = socket.handshake?.auth?.token || null
    const newTuid = socket.data?.tuid || null

    // Check if this tuid is already in the game (reconnect scenario)
    let existingRole = null
    for (const role of ['a', 'b']) {
      if (this.players[role].tuid && this.players[role].tuid === newTuid) {
        existingRole = role
        break
      }
    }

    if (existingRole) {
      // Reconnecting player
      // Note: Old socket already disconnected globally in index.js
      
      // Clear disconnect timeout if exists
      if (this.disconnectTimeouts && this.disconnectTimeouts[existingRole]) {
        clearTimeout(this.disconnectTimeouts[existingRole])
        delete this.disconnectTimeouts[existingRole]
        console.log(`[Game ${this.gameId}] Cleared disconnect timeout for ${existingRole}`)
      }
      
      // Update socket id for reconnecting player
      this.players[existingRole].sid = socket.id
      if (token) this.players[existingRole].token = token
      socket.join(this.room)
      
      console.log(`[Game ${this.gameId}] Player ${existingRole} reconnected (tuid: ${newTuid})`)
      this.emitState()
      return existingRole
    }

    // New player - assign to a or b
    const role = !this.players.a.sid ? 'a' : (!this.players.b.sid ? 'b' : null)
    if (!role) {
      socket.emit('error', { code: 'ROOM_FULL', message: 'Game already has two players' })
      return null
    }

    this.players[role].sid = socket.id
    if (token) this.players[role].token = token
    if (newTuid) this.players[role].tuid = newTuid
    socket.join(this.room)

    console.log(`[Game ${this.gameId}] Player ${role} joined (tuid: ${newTuid})`)

    if (this.players.a.sid && this.players.b.sid) {
      this.setPhase('placing')
      // Start timer immediately when both players connected
      this.startPlacingTimer()
    }
    this.emitState()
    return role
  }

  removePlayerBySid(sid) {
    for (const role of ['a', 'b']) {
      if (this.players[role].sid === sid) {
        console.log(`[Game ${this.gameId}] Player ${role} disconnected (sid: ${sid})`)
        
        // Don't immediately remove - just clear socket id to allow reconnect
        this.players[role].sid = null
        
        // Set a timeout to handle prolonged disconnection
        // If player doesn't reconnect within 30 seconds, they lose
        const disconnectTimeout = setTimeout(() => {
          // Check if player reconnected (sid will be set again)
          if (this.players[role].sid === null) {
            console.log(`[Game ${this.gameId}] Player ${role} failed to reconnect, ending game`)
            
            // If in placing phase or waiting, award win to opponent
            if (this.phase === 'placing' || this.phase === 'waiting_players') {
              const opponent = role === 'a' ? 'b' : 'a'
              const opponentStillPresent = this.players[opponent].sid !== null
              
              if (opponentStillPresent) {
                this.finish(opponent, { reason: 'opponent_disconnected' })
              } else {
                // Both disconnected, clean up
                this.manager.delete(this.gameId)
              }
            } else if (this.phase === 'turn_a' || this.phase === 'turn_b') {
              // During game, opponent wins
              const opponent = role === 'a' ? 'b' : 'a'
              this.finish(opponent, { reason: 'opponent_disconnected' })
            }
          }
        }, 30000) // 30 second grace period for reconnect
        
        // Store timeout so we can clear it if player reconnects
        if (!this.disconnectTimeouts) this.disconnectTimeouts = {}
        this.disconnectTimeouts[role] = disconnectTimeout
        
        break
      }
    }
  }

  setPhase(p) {
    this.phase = p
    this.bumpVersion()
  }

  bumpVersion() { this.version++ }

  playerRoleBySid(sid) {
    if (this.players.a.sid === sid) return 'a'
    if (this.players.b.sid === sid) return 'b'
    return null
  }

  bothSecretsPlaced() {
    return this.players.a.secret !== null && this.players.b.secret !== null
  }

  placeSecret(sid, cell) {
    const role = this.playerRoleBySid(sid)
    if (!role) return
    // Allow placing secret in waiting_players or placing phase
    if (this.phase !== 'placing' && this.phase !== 'waiting_players') return
    if (typeof cell !== 'number' || cell < 0 || cell > 15) return
    if (this.players[role].secret !== null) return
    
    this.players[role].secret = cell
    this.bumpVersion()
    this.emitState()

    // Also persist to backend to keep original logic intact
    this.apiSetField(role, cell).catch(() => {})

    // Check if both players are connected AND both secrets placed
    if (this.players.a.sid && this.players.b.sid && this.bothSecretsPlaced()) {
      this.doToss()
    }
  }

  doToss() {
    this.clearPlacingTimer() // Clear placing timer when moving to toss
    this.setPhase('toss')
    // Random choose starter
    const first = randomInt(0, 2) === 0 ? 'a' : 'b'
    this.turn = first
    this.nsp.to(this.room).emit('toss', { firstTurn: first, seed: Date.now() })
    // Small delay to allow UI animation, then start turn
    setTimeout(() => {
      this.startTurn(first)
    }, 600)
  }

  startTurn(role) {
    this.turn = role
    const newPhase = role === 'a' ? 'turn_a' : 'turn_b'
    this.setPhase(newPhase)
    this.startTimer()
    this.emitState()
  }

  startTimer() {
    this.clearTimer()
    const tickMs = 250
    this.timer = setInterval(() => {
      if (!this.turn) return
      const p = this.players[this.turn]
      p.timeLeft = Math.max(0, p.timeLeft - tickMs)
      if (p.timeLeft === 0) {
        this.clearTimer()
        const loser = this.turn
        const winner = loser === 'a' ? 'b' : 'a'
        // Call concede on behalf of the player who ran out of time
        this.apiConcede(loser)
          .then((rewards) => {
            this.finish(winner, { reason: 'timeout', rewards })
          })
          .catch(() => {
            // Still finish the game even if API call fails
            this.finish(winner, { reason: 'timeout' })
          })
      } else {
        this.emitState()
      }
    }, tickMs)
  }

  clearTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null } }

  startPlacingTimer() {
    this.clearPlacingTimer()
    this.placingTimerStarted = true // Mark that timer has started
    const tickMs = 250
    this.placingTimer = setInterval(() => {
      this.placingTimeLeft = Math.max(0, this.placingTimeLeft - tickMs)
      if (this.placingTimeLeft === 0) {
        this.clearPlacingTimer()
        // Time's up in placing phase - find who didn't place their secret
        const aPlaced = this.players.a.secret !== null
        const bPlaced = this.players.b.secret !== null
        
        if (!aPlaced && !bPlaced) {
          // Both failed to place - call cancel API
          this.apiCancel()
            .then(() => {
              this.finish(null, { reason: 'placing_timeout_both' })
            })
            .catch(() => {
              // Still finish even if API call fails
              this.finish(null, { reason: 'placing_timeout_both' })
            })
        } else if (!aPlaced) {
          // Player A didn't place, B wins
          this.apiConcede('a')
            .then((rewards) => {
              this.finish('b', { reason: 'placing_timeout', rewards })
            })
            .catch(() => {
              this.finish('b', { reason: 'placing_timeout' })
            })
        } else if (!bPlaced) {
          // Player B didn't place, A wins
          this.apiConcede('b')
            .then((rewards) => {
              this.finish('a', { reason: 'placing_timeout', rewards })
            })
            .catch(() => {
              this.finish('a', { reason: 'placing_timeout' })
            })
        }
      } else {
        this.emitState()
      }
    }, tickMs)
  }

  clearPlacingTimer() { 
    if (this.placingTimer) { 
      clearInterval(this.placingTimer)
      this.placingTimer = null 
    } 
  }

  async move(sid, cell, moveId) {
    const role = this.playerRoleBySid(sid)
    if (!role) return
    if (!this.turn || (this.turn !== role)) return
    if (this.phase !== 'turn_a' && this.phase !== 'turn_b') return
    if (typeof cell !== 'number' || cell < 0 || cell > 15) return
    // idempotency: ignore duplicate moveIds from same role
    if (moveId && this.moveIds[role].has(moveId)) {
      return
    }
    if (moveId) this.moveIds[role].add(moveId)
    const opponent = role === 'a' ? 'b' : 'a'

    // Delegate hit/miss truth to backend step, preserving wallet logic
    try {
      const res = await this.apiStep(role, cell)
      if (Array.isArray(res)) {
        // Backend returns gifts[] on win
        this.nsp.to(this.room).emit('move_result', { by: role, cell, result: 'hit', winner: role, rewards: res })
        this.finish(role, { reason: 'hit', rewards: res })
        return
      }
      // Miss path
      this.players[role].timeLeft = Math.min(60000, this.players[role].timeLeft + 3000)
      this.nsp.to(this.room).emit('move_result', { by: role, cell, result: 'miss' })
      const next = opponent
      this.startTurn(next)
    } catch (e) {
      // transient error: do not switch turn, allow retry on client side implicitly
      this.nsp.to(this.room).emit('error', { code: 'STEP_FAILED', message: 'Move failed, try again' })
    }
  }



  finish(winner, extra = {}) {
    this.clearTimer()
    this.clearPlacingTimer()
    this.setPhase('finished')
    this.nsp.to(this.room).emit('game_over', { winner, ...extra })
    this.emitState()
    
    // Cleanup: delete this game from manager after 30 seconds to free memory
    setTimeout(() => {
      this.manager.delete(this.gameId)
    }, 30000)
  }

  stateFor(sid) {
    const role = this.playerRoleBySid(sid)
    const you = role
    const opp = role === 'a' ? 'b' : 'a'
    const timeA = this.players.a.timeLeft
    const timeB = this.players.b.timeLeft
    return {
      version: this.version,
      gameId: this.gameId,
      phase: this.phase,
      turn: this.turn,
      you: role,
      players: {
        a: { timeLeft: timeA, present: !!this.players.a.sid },
        b: { timeLeft: timeB, present: !!this.players.b.sid },
      },
      placingTimeLeft: this.placingTimeLeft, // Send placing timer to client
      placingTimerStarted: this.placingTimerStarted, // Send timer started flag
      // we do not reveal secrets here
    }
  }

  emitState() {
    // Emit per-socket tailored state
    for (const role of ['a', 'b']) {
      const sid = this.players[role].sid
      if (!sid) continue
      const s = this.nsp.sockets.get(sid)
      if (s) {
        const state = this.stateFor(sid)
        s.emit('state', state)
      }
    }
  }

  // --- Backend API helpers ---
  get apiBase() {
    // Prefer explicit API_BASE; fallback to Vite dev proxy in local env
    const base = process.env.API_BASE || process.env.VITE_API_BASE
    if (base) return base
    // Dev fallback: route via Vite proxy so requests go to real backend
    return 'http://localhost:5173'
  }
  axiosFor(role) {
    const token = this.players[role]?.token
    const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
    return axios.create({ baseURL: this.apiBase, headers, timeout: 15000 })
  }
  async apiSetField(role, cell) {
    const api = this.axiosFor(role)
    // server expects { game_id, field }
    await api.post('/lobby/set_field', { game_id: Number(this.gameId), field: cell })
  }
  async apiStep(role, cell) {
    const api = this.axiosFor(role)
    const res = await api.post('/lobby/step', { game_id: Number(this.gameId), field: cell })
    return res.data
  }
  async apiConcede(role) {
    const api = this.axiosFor(role)
    const winnerRole = role === 'a' ? 'b' : 'a'
    const winnerTuid = this.players[winnerRole]?.tuid
    const res = await api.post('/lobby/concede', { game_id: Number(this.gameId), tuid: winnerTuid })
    // Backend returns gifts array directly
    return Array.isArray(res?.data) ? res.data : []
  }
  
  async apiCancel() {
    // Cancel game when both players failed to place
    // Use first available token (prefer player A)
    const role = this.players.a.token ? 'a' : (this.players.b.token ? 'b' : null)
    if (!role) {
      console.warn('apiCancel: no token available for cancel request')
      return
    }
    const api = this.axiosFor(role)
    await api.post('/lobby/cancel_game', { game_id: Number(this.gameId) })
  }
}
