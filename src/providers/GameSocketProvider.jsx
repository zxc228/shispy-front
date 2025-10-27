import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '../shared/api/client'
import { logger } from '../shared/logger'
import ConnectionError from '../components/common/ConnectionError'
import DuplicateConnectionScreen from '../components/common/DuplicateConnectionScreen'
import { useTelegram } from './TelegramProvider'

const GameSocketContext = createContext({
  connected: false,
  getSocket: () => null,
})

export function GameSocketProvider({ children }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [authToken, setAuthToken] = useState(() => getToken())
  const [showConnectionError, setShowConnectionError] = useState(false)
  const [showDuplicateConnection, setShowDuplicateConnection] = useState(false)
  const [errorDetails, setErrorDetails] = useState(null) // Store error details
  const reconnectAttempts = useRef(0)
  const lastActivityRef = useRef(Date.now())
  const inactivityCheckRef = useRef(null)
  const { user } = useTelegram?.() || { user: null }
  const tuid = user?.id || null

  // Connect socket and recreate when token changes (Telegram auth may arrive later)
  useEffect(() => {
    // Wait for auth token before connecting
    if (!authToken) {
      logger.debug('GameSocket: waiting for auth token...')
      return
    }
    
    // Wait for tuid before connecting (important for duplicate detection)
    if (!tuid) {
      logger.debug('GameSocket: waiting for tuid...')
      return
    }

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
          auth: { token: authToken, tuid }, // Pass tuid in auth
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
        }
        logger.info(`GameSocket: connecting (dev mode) url=${socketUrl} tuid=${tuid}`)
      } else {
        // Production: wsUrl is transport path, use namespace separately
        socketUrl = namespace
        options = {
          path: wsUrl,
          autoConnect: true,
          transports: ['websocket', 'polling'],
          auth: { token: authToken, tuid }, // Pass tuid in auth
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
        }
        logger.info(`GameSocket: connecting (prod mode) namespace=${namespace} path=${wsUrl} tuid=${tuid}`)
      }
      
      const s = io(socketUrl, options)
      socketRef.current = s
      const onConnect = () => {
        logger.info('GameSocket: connected ✅', { id: s.id })
        setConnected(true)
        setShowConnectionError(false)
        setErrorDetails(null)
        reconnectAttempts.current = 0
        lastActivityRef.current = Date.now()
      }
      const onDisconnect = (reason) => {
        logger.warn('GameSocket: disconnected ❌', { reason })
        setConnected(false)
        
        // Special handling for server disconnect (not user-initiated)
        if (reason === 'io server disconnect') {
          // This might be a kick or server-side disconnect
          setErrorDetails({
            title: 'Соединение прервано',
            message: 'Сервер разорвал соединение. Возможно, вы слишком долго были неактивны.',
            code: 'SERVER_DISCONNECT'
          })
          setShowConnectionError(true)
          return
        }
        
        // Show error screen after 3 failed reconnection attempts
        if (reconnectAttempts.current >= 3) {
          setErrorDetails({
            title: 'Ошибка подключения',
            message: 'Не удается подключиться к серверу. Проверьте интернет-соединение.',
            code: 'CONNECTION_FAILED'
          })
          setShowConnectionError(true)
        }
      }
      const onConnectError = (e) => {
        logger.error('GameSocket: connect_error ⚠️', { message: e?.message || String(e), code: e?.code })
        reconnectAttempts.current += 1
        // Show error screen after 3 failed attempts
        if (reconnectAttempts.current >= 3) {
          setErrorDetails({
            title: 'Ошибка подключения',
            message: 'Не удается подключиться к серверу. Проверьте интернет-соединение.',
            code: 'CONNECTION_ERROR'
          })
          setShowConnectionError(true)
        }
      }
      const onError = (e) => {
        logger.error('GameSocket: socket error ⚠️', { message: e?.message || String(e) })
        
        // Check if this is a duplicate connection error
        if (e?.code === 'DUPLICATE_CONNECTION' || e?.message?.includes('another device')) {
          logger.warn('GameSocket: duplicate connection detected - showing block screen')
          
          // Disconnect socket immediately
          if (s) {
            s.disconnect()
          }
          
          // Show screen after a small delay to ensure clean disconnect
          setTimeout(() => {
            setShowDuplicateConnection(true)
          }, 300)
          return
        }
        
        // Check if this is a session expired error
        if (e?.code === 'SESSION_EXPIRED') {
          logger.warn('GameSocket: session expired')
          setErrorDetails({
            title: 'Сессия истекла',
            message: 'Вы слишком долго были неактивны. Пожалуйста, переподключитесь.',
            code: 'SESSION_EXPIRED'
          })
          setShowConnectionError(true)
          // Disconnect to prevent auto-reconnect
          if (s) {
            s.disconnect()
          }
          return
        }
        
        // For other errors, show general error screen
        setErrorDetails({
          title: 'Произошла ошибка',
          message: e?.message || 'Неизвестная ошибка сокета',
          code: e?.code || 'UNKNOWN_ERROR'
        })
        setShowConnectionError(true)
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
  }, [authToken, tuid]) // Re-connect when tuid changes too

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

  const handleReloadAfterDuplicate = () => {
    // Clear the duplicate connection flag before reload
    setShowDuplicateConnection(false)
    
    // Disconnect socket cleanly
    const socket = socketRef.current
    if (socket) {
      socket.disconnect()
      socketRef.current = null
    }
    
    // Wait a moment before reload to ensure clean disconnect
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <GameSocketContext.Provider value={value}>
      {children}
      <ConnectionError show={showConnectionError} onRetry={handleRetry} errorDetails={errorDetails} />
      {showDuplicateConnection && <DuplicateConnectionScreen onReload={handleReloadAfterDuplicate} />}
    </GameSocketContext.Provider>
  )
}

export function useGameSocket() {
  return useContext(GameSocketContext)
}
