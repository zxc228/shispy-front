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

// Global map to track user connections: tuid -> socket.id
const userConnections = new Map()

// Function to disconnect old socket for a user
function disconnectOldUserSocket(tuid, newSocketId) {
  const oldSocketId = userConnections.get(tuid)
  if (oldSocketId && oldSocketId !== newSocketId) {
    const oldSocket = nsp.sockets.get(oldSocketId)
    if (oldSocket) {
      console.log(`[Global] Disconnecting old socket ${oldSocketId} for tuid ${tuid}, new socket: ${newSocketId}`)
      oldSocket.emit('error', { code: 'DUPLICATE_CONNECTION', message: 'Connected from another device' })
      oldSocket.disconnect(true)
    }
  }
  // Update to new socket
  userConnections.set(tuid, newSocketId)
}

// Broadcast online count every 10 seconds
function broadcastOnlineCount() {
  const count = nsp.sockets.size
  nsp.emit('online_count', { count })
}

// Initial broadcast after 2 seconds, then every 10 seconds
setTimeout(broadcastOnlineCount, 2000)
setInterval(broadcastOnlineCount, 10000)

nsp.on('connection', (socket) => {
  // Send current count immediately to new connection
  const count = nsp.sockets.size
  socket.emit('online_count', { count })
  
  // Get tuid from auth token/handshake
  const tuid = socket.handshake?.auth?.tuid || null
  
  // Track last activity for session timeout (30 minutes)
  let lastActivity = Date.now()
  const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  
  // Check for inactivity every 5 minutes
  const inactivityCheck = setInterval(() => {
    const inactive = Date.now() - lastActivity
    if (inactive > SESSION_TIMEOUT) {
      console.log(`[Global] Session timeout for tuid ${tuid}, disconnecting...`)
      socket.emit('error', { code: 'SESSION_EXPIRED', message: 'Session expired due to inactivity' })
      socket.disconnect(true)
    }
  }, 5 * 60 * 1000) // Check every 5 minutes
  
  // Update activity on any event
  const updateActivity = () => {
    lastActivity = Date.now()
  }
  
  // IMMEDIATELY disconnect any old socket for this user GLOBALLY
  if (tuid) {
    const userTuid = Number(tuid)
    const oldSocketId = userConnections.get(userTuid)
    
    if (oldSocketId && oldSocketId !== socket.id) {
      const oldSocket = nsp.sockets.get(oldSocketId)
      if (oldSocket) {
        console.log(`[Global] IMMEDIATELY disconnecting old socket ${oldSocketId} for tuid ${userTuid}, new socket: ${socket.id}`)
        oldSocket.emit('error', { code: 'DUPLICATE_CONNECTION', message: 'Connected from another device' })
        oldSocket.disconnect(true)
      }
    }
    
    // Register new socket for this user
    userConnections.set(userTuid, socket.id)
    socket.data.tuid = userTuid
    console.log(`[Global] Registered new socket ${socket.id} for tuid ${userTuid}`)
  }
  
  let game = null
  let role = null

  socket.on('join_game', ({ gameId, tuid } = {}) => {
    updateActivity() // Update activity
    
    if (!gameId) {
      socket.emit('error', { code: 'BAD_REQUEST', message: 'Missing gameId' })
      return
    }
    
    // Update tuid from join_game if provided (fallback)
    if (tuid && !socket.data.tuid) {
      const userTuid = Number(tuid)
      disconnectOldUserSocket(userTuid, socket.id)
      socket.data.tuid = userTuid
    }
    
    game = manager.get(String(gameId))
    role = game.addPlayer(socket)
    if (role) {
      socket.emit('joined', { gameId: String(gameId), role })
    }
  })

  socket.on('place_secret', ({ cell } = {}) => {
    updateActivity() // Update activity
    if (!game) return
    game.placeSecret(socket.id, Number(cell))
  })

  socket.on('move', ({ cell, moveId } = {}) => {
    updateActivity() // Update activity
    if (!game) return
    game.move(socket.id, Number(cell), moveId)
  })

  socket.on('ping', () => {
    updateActivity() // Update activity
    socket.emit('pong')
  })

  socket.on('disconnect', () => {
    // Clear inactivity check
    clearInterval(inactivityCheck)
    
    // Remove from global tracking only if this is the current socket
    const userTuid = socket.data.tuid
    if (userTuid && userConnections.get(userTuid) === socket.id) {
      userConnections.delete(userTuid)
      console.log(`[Global] Removed tuid ${userTuid} from tracking on disconnect`)
    }
    
    if (game) game.removePlayerBySid(socket.id)
    // Broadcast updated count after disconnect
    setTimeout(broadcastOnlineCount, 100)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Shipsy Game Server listening on http://localhost:${PORT}`)
})
