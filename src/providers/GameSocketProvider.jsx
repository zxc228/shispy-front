import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '../shared/api/client'
import { logger } from '../shared/logger'

const GameSocketContext = createContext({
  connected: false,
  getSocket: () => null,
})

export function GameSocketProvider({ children }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [authToken, setAuthToken] = useState(() => getToken())

  // Connect socket and recreate when token changes (Telegram auth may arrive later)
  useEffect(() => {
    try {
      const url = import.meta.env.VITE_GAME_WS_URL || '/game'
      logger.info(`GameSocket: connecting to ${url}`, { authToken: !!authToken })
      const s = io(url, {
        autoConnect: true,
        transports: ['websocket'],
        auth: authToken ? { token: authToken } : undefined,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
      })
      socketRef.current = s
      const onConnect = () => {
        logger.info('GameSocket: connected ✅', { id: s.id })
        setConnected(true)
      }
      const onDisconnect = (reason) => {
        logger.warn('GameSocket: disconnected ❌', { reason })
        setConnected(false)
      }
      const onConnectError = (e) => {
        logger.error('GameSocket: connect_error ⚠️', { message: e?.message || String(e), code: e?.code })
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

  return (
    <GameSocketContext.Provider value={value}>{children}</GameSocketContext.Provider>
  )
}

export function useGameSocket() {
  return useContext(GameSocketContext)
}
