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
    this.version = 0
    this.moveIds = { a: new Set(), b: new Set() }
  }

  roomName(id) { return `game:${id}` }

  dispose() {
    this.clearTimer()
  }

  addPlayer(socket) {
    // If game is already finished, don't allow rejoins
    if (this.phase === 'finished') {
      socket.emit('error', { code: 'GAME_FINISHED', message: 'This game has already ended' })
      return null
    }
    // assign to a or b
    const role = !this.players.a.sid ? 'a' : (!this.players.b.sid ? 'b' : null)
    if (!role) {
      socket.emit('error', { code: 'ROOM_FULL', message: 'Game already has two players' })
      return null
    }
    this.players[role].sid = socket.id
    // read token from auth and tuid from last join payload saved on socket.data
    const token = socket.handshake?.auth?.token || null
    if (token) this.players[role].token = token
    if (socket.data?.tuid) this.players[role].tuid = socket.data.tuid
    socket.join(this.room)

    if (this.players.a.sid && this.players.b.sid) {
      this.setPhase('placing')
    }
    this.emitState()
    return role
  }

  removePlayerBySid(sid) {
    for (const role of ['a', 'b']) {
      if (this.players[role].sid === sid) {
        this.players[role].sid = null
      }
    }
    // Optional: if both left or one leaves early, end game
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
    if (this.phase !== 'placing') return
    if (typeof cell !== 'number' || cell < 0 || cell > 15) return
    if (this.players[role].secret !== null) return
    this.players[role].secret = cell
    this.bumpVersion()
    this.emitState()

    // Also persist to backend to keep original logic intact
    this.apiSetField(role, cell).catch(() => {})

    if (this.bothSecretsPlaced()) {
      this.doToss()
    }
  }

  doToss() {
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
    await api.post('/lobby/set_filed', { game_id: Number(this.gameId), field: cell })
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
}
