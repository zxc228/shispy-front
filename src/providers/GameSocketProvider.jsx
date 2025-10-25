import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '../shared/api/client'
import { logger } from '../shared/logger'
import ConnectionError from '../components/common/ConnectionError'

const GameSocketContext = createContext({
  connected: false,
  getSocket: () => null,
})

export function GameSocketProvider({ children }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [authToken, setAuthToken] = useState(() => getToken())
  const [showConnectionError, setShowConnectionError] = useState(false)
  const reconnectAttempts = useRef(0)

  // Connect socket and recreate when token changes (Telegram auth may arrive later)
  useEffect(() => {
    try {
      // Parse VITE_GAME_WS_URL: can be either:
      // 1) Full URL like 'http://localhost:3001' (development with local game server)
      // 2) Path like '/socket.io' (production with Nginx proxy)
      const wsUrl = import.meta.env.VITE_GAME_WS_URL || '/socket.io'
      const namespace = import.meta.env.VITE_GAME_NAMESPACE || '/'
      
      let socketUrl, options
      
      // If wsUrl starts with http:// or https://, it's a full URL (development mode)
      if (wsUrl.startsWith('http://') || wsUrl.startsWith('https://')) {
        // Development: connect to full URL + namespace
        socketUrl = wsUrl + namespace
        options = {
          autoConnect: true,
          transports: ['websocket', 'polling'],
          auth: authToken ? { token: authToken } : undefined,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
        }
        logger.info(`GameSocket: connecting (dev mode) url=${socketUrl}`, { authToken: !!authToken })
      } else {
        // Production: wsUrl is transport path, use namespace separately
        socketUrl = namespace
        options = {
          path: wsUrl,
          autoConnect: true,
          transports: ['websocket', 'polling'],
          auth: authToken ? { token: authToken } : undefined,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
        }
        logger.info(`GameSocket: connecting (prod mode) namespace=${namespace} path=${wsUrl}`, { authToken: !!authToken })
      }
      
      const s = io(socketUrl, options)
      socketRef.current = s
      const onConnect = () => {
        logger.info('GameSocket: connected ✅', { id: s.id })
        setConnected(true)
        setShowConnectionError(false)
        reconnectAttempts.current = 0
      }
      const onDisconnect = (reason) => {
        logger.warn('GameSocket: disconnected ❌', { reason })
        setConnected(false)
        // Show error screen after 3 failed attempts
        if (reconnectAttempts.current >= 3) {
          setShowConnectionError(true)
        }
      }
      const onConnectError = (e) => {
        logger.error('GameSocket: connect_error ⚠️', { message: e?.message || String(e), code: e?.code })
        reconnectAttempts.current += 1
        // Show error screen after 3 failed attempts
        if (reconnectAttempts.current >= 3) {
          setShowConnectionError(true)
        }
      }
      const onError = (e) => {
        logger.error('GameSocket: socket error ⚠️', { message: e?.message || String(e) })
      }
      
      s.on('connect', onConnect)
      s.on('disconnect', onDisconnect)
      s.on('connect_error', onConnectError)
      s.on('error', onError)
      
      // Log all incoming events for debugging
      s.onAny((eventName, ...args) => {
        logger.debug(`GameSocket: ← ${eventName}`, args)
      })
      return () => {
        s.off('connect', onConnect)
        s.off('disconnect', onDisconnect)
        s.off('connect_error', onConnectError)
        s.off('error', onError)
        s.offAny()
        s.disconnect()
        logger.info('GameSocket: cleanup and disconnect')
      }
    } catch (e) {
      logger.warn('GameSocketProvider connect failed', e)
      setConnected(false)
    }
  }, [authToken])

  // Poll storage for token changes and update authToken
  useEffect(() => {
    const id = setInterval(() => {
      const t = getToken()
      setAuthToken((prev) => (prev !== t ? t : prev))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const value = useMemo(() => ({
    connected,
    getSocket: () => socketRef.current,
  }), [connected])

  const handleRetry = () => {
    setShowConnectionError(false)
    reconnectAttempts.current = 0
    const socket = socketRef.current
    if (socket) {
      socket.connect()
    } else {
      // Force reload if socket is dead
      window.location.reload()
    }
  }

  return (
    <GameSocketContext.Provider value={value}>
      {children}
      <ConnectionError show={showConnectionError} onRetry={handleRetry} />
    </GameSocketContext.Provider>
  )
}

export function useGameSocket() {
  return useContext(GameSocketContext)
}
