import http from 'http'
import { Server as IOServer } from 'socket.io'
import { GameManager } from './game.js'

const PORT = process.env.PORT || 4000

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Shipsy Game Server is running')
})

const io = new IOServer(httpServer, {
  cors: {
    origin: '*', // tighten in prod
    methods: ['GET', 'POST']
  }
})

// Very minimal wiring: namespace /game, per-game rooms by gameId
const nsp = io.of('/game')
const manager = new GameManager(io, nsp)

// Broadcast online count every 10 seconds
function broadcastOnlineCount() {
  const count = nsp.sockets.size
  nsp.emit('online_count', { count })
  console.log(`[STATS] Broadcasting online count: ${count}`)
}

// Initial broadcast after 2 seconds, then every 10 seconds
setTimeout(broadcastOnlineCount, 2000)
setInterval(broadcastOnlineCount, 10000)

nsp.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`)
  // Send current count immediately to new connection
  const count = nsp.sockets.size
  socket.emit('online_count', { count })
  
  let game = null
  let role = null

  socket.on('join_game', ({ gameId, tuid } = {}) => {
    console.log(`[SOCKET] join_game from ${socket.id}: gameId=${gameId}, tuid=${tuid}`)
    if (!gameId) {
      socket.emit('error', { code: 'BAD_REQUEST', message: 'Missing gameId' })
      return
    }
    game = manager.get(String(gameId))
    // store tuid on socket for Game to pick up
    if (tuid) socket.data.tuid = Number(tuid)
    role = game.addPlayer(socket)
    console.log(`[SOCKET] Player assigned role: ${role} in game ${gameId}`)
    if (role) {
      socket.emit('joined', { gameId: String(gameId), role })
    }
  })

  socket.on('place_secret', ({ cell } = {}) => {
    console.log(`[SOCKET] place_secret from ${socket.id}: cell=${cell}`)
    if (!game) return
    game.placeSecret(socket.id, Number(cell))
  })

  socket.on('move', ({ cell, moveId } = {}) => {
    console.log(`[SOCKET] move from ${socket.id}: cell=${cell}, moveId=${moveId}`)
    if (!game) return
    game.move(socket.id, Number(cell), moveId)
  })

  socket.on('concede', () => {
    console.log(`[SOCKET] concede from ${socket.id}`)
    if (!game) return
    game.concede(socket.id)
  })

  socket.on('ping', () => socket.emit('pong'))

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`)
    if (game) game.removePlayerBySid(socket.id)
    // Broadcast updated count after disconnect
    setTimeout(broadcastOnlineCount, 100)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Shipsy Game Server listening on http://localhost:${PORT}`)
})
