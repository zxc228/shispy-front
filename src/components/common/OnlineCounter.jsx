import { useEffect, useState } from 'react'
import { useGameSocket } from '../../providers/GameSocketProvider'
import { logger } from '../../shared/logger'

/**
 * OnlineCounter displays the number of currently connected players.
 * Listens to 'online_count' events from the Socket.IO game server.
 */
export default function OnlineCounter() {
  const { connected, getSocket } = useGameSocket()
  const [count, setCount] = useState(null)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleOnlineCount = ({ count: newCount }) => {
      setCount(newCount)
      logger.debug(`OnlineCounter: Received online_count = ${newCount}`)
    }

    socket.on('online_count', handleOnlineCount)

    return () => {
      socket.off('online_count', handleOnlineCount)
    }
  }, [getSocket])

  // Don't render if not connected or no count yet
  if (!connected || count === null) {
    return null
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
      <div className="relative flex items-center">
        <span className="text-xs">👥</span>
        {/* Pulse indicator when online */}
        <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
        </span>
      </div>
      <span className="text-xs font-medium text-white/80 tabular-nums">
        {count.toLocaleString()}
      </span>
    </div>
  )
}
