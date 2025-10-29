import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWaitingStatus, cancelLobby } from '../../shared/api/lobby.api'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'
import TgsSticker from '../../components/common/TgsSticker'
import cannonTgs from '../../components/tgs/Cannon.tgs'

export default function WaitingScreen() {
  const navigate = useNavigate()
  const { withLoading } = useLoading()
  const [dots, setDots] = useState('.')
  const [secondsWaiting, setSecondsWaiting] = useState(0)
  const [foundOpponent, setFoundOpponent] = useState(false)

  // Анимация точек
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Счётчик времени ожидания (от времени начала поиска из sessionStorage)
  useEffect(() => {
    // Initialize or read persistent start timestamp
    let startedAt = 0
    try {
      const existing = Number(sessionStorage.getItem('search_started_at') || '0')
      if (existing > 0) {
        startedAt = existing
      } else {
        startedAt = Date.now()
        sessionStorage.setItem('search_started_at', String(startedAt))
      }
    } catch {
      startedAt = Date.now()
    }

    const tick = async () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      setSecondsWaiting(elapsed)
      // Auto-cancel if > 60 seconds
      if (elapsed >= 60) {
        try { await cancelLobby() } catch {}
        try {
          sessionStorage.removeItem('pending_bet')
          sessionStorage.removeItem('search_started_at')
        } catch {}
        logger.info('WaitingScreen: search timeout reached (60s). Cancelled and returning to lobby')
        navigate('/lobby', { replace: true })
      }
    }

    // Update every second
    const interval = setInterval(tick, 1000)
    // Run once immediately
    tick()
    return () => clearInterval(interval)
  }, [navigate])

  // Поллинг статуса
  useEffect(() => {
    let cancelled = false
    let timerId

    const check = async () => {
      try {
        const res = await getWaitingStatus()
        if (cancelled) return

        // Если игра найдена, переходим в батл
        if (res?.status === -1 && Number.isFinite(Number(res?.game_id))) {
          const gameId = Number(res.game_id)
          
          // Показываем анимацию "Opponent found!"
          setFoundOpponent(true)
          
          // Переносим pending_bet
          try {
            const pending = sessionStorage.getItem('pending_bet')
            if (pending) {
              sessionStorage.setItem(`battle_bet_${gameId}`, pending)
              sessionStorage.removeItem('pending_bet')
            }
            // Clear search timer when battle starts
            sessionStorage.removeItem('search_started_at')
          } catch (e) {
            logger.warn('WaitingScreen: failed to transfer bet', e)
          }

          // Задержка 1.5 секунды для показа анимации
          setTimeout(() => {
            navigate(`/lobby/battle/${gameId}`, { replace: true })
          }, 1500)
          return
        }

        // Продолжаем ждать
        if (!cancelled) timerId = setTimeout(check, 3000)
      } catch (e) {
        logger.error('WaitingScreen: polling error', e)
        if (!cancelled) timerId = setTimeout(check, 3000)
      }
    }

    check()
    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
    }
  }, [navigate])

  const handleCancel = async () => {
    try {
      await withLoading(() => cancelLobby())
      sessionStorage.removeItem('pending_bet')
      sessionStorage.removeItem('search_started_at')
      navigate('/lobby', { replace: true })
    } catch (e) {
      logger.error('WaitingScreen: cancel failed', e)
      // Navigate anyway
      sessionStorage.removeItem('search_started_at')
      navigate('/lobby', { replace: true })
    }
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-black text-white flex flex-col items-center justify-center px-4">
      {foundOpponent ? (
        // Анимация "Opponent Found!"
        <div className="flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
          <div className="mb-8 relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center">
              <div className="text-6xl animate-[bounce_0.6s_ease-in-out_2]">
                ⚔️
              </div>
            </div>
            {/* Success ripple */}
            <div className="absolute inset-0 rounded-full border-4 border-green-400/50 animate-[ping_1s_cubic-bezier(0,0,0.2,1)_2]"></div>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-green-400 animate-[slideUp_0.5s_ease-out]">
            Opponent Found!
          </h1>
          <p className="text-neutral-300 text-center animate-[slideUp_0.5s_ease-out_0.1s_both]">
            Preparing battle...
          </p>
        </div>
      ) : (
        // Обычное состояние ожидания
        <>
          {/* Animated ship/treasure icon */}
          <div className="mb-8 relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-600/20 flex items-center justify-center">
              <TgsSticker 
                src={cannonTgs}
                width={100}
                height={100}
                loop={true}
                autoplay={true}
              />
            </div>
            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-full border-4 border-orange-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2 text-center">
            Searching for opponent{dots}
          </h1>

          {/* Subtitle */}
          <p className="text-neutral-400 text-center mb-8">
            We're finding a worthy challenger for you
          </p>

          {/* Timer */}
          <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-neutral-800/50 border border-neutral-700">
            <span className="text-2xl">⏱️</span>
            <span className="text-lg font-mono text-neutral-300">
              {String(Math.floor(secondsWaiting / 60)).padStart(2, '0')}:{String(secondsWaiting % 60).padStart(2, '0')}
            </span>
          </div>

          {/* Tips */}
          <div className="max-w-[280px] space-y-3">
            <div className="flex items-start gap-3 text-sm text-neutral-400">
              <span className="text-lg">💡</span>
              <p>The game starts immediately when an opponent joins</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-neutral-400">
              <span className="text-lg">🎯</span>
              <p>Remember to place your treasure before the timer runs out</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-neutral-400">
              <span className="text-lg">⚡</span>
              <p>You have 25 seconds per turn, +3s for each move</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-[280px] mt-8 h-1 rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 animate-[shimmer_2s_ease-in-out_infinite]"></div>
          </div>

          {/* Cancel button */}
          <button
            onClick={handleCancel}
            className="mt-8 px-6 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white font-semibold hover:bg-neutral-700 active:translate-y-[0.5px] transition-colors"
          >
            Cancel Search
          </button>
        </>
      )}
    </div>
  )
}
