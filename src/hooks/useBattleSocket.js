import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameSocket } from '../providers/GameSocketProvider'
import { logger } from '../shared/logger'
import { useTelegram } from '../providers/TelegramProvider'

export default function useBattleSocket(gameId) {
  const { getSocket, connected } = useGameSocket()
  const [ready, setReady] = useState(false)
  const [role, setRole] = useState(null) // 'a' | 'b'
  const [phase, setPhase] = useState('waiting')
  const [turn, setTurn] = useState(null)
  const [timeLeft, setTimeLeft] = useState({ a: 25000, b: 25000 })
  const [placingTimeLeft, setPlacingTimeLeft] = useState(60000)
  const [placingTimerStarted, setPlacingTimerStarted] = useState(false)
  const [lastMove, setLastMove] = useState(null)
  const [toss, setToss] = useState(null)
  const [gameOver, setGameOver] = useState(null)
  const [lastError, setLastError] = useState(null)
  const { user } = useTelegram?.() || { user: null }

  const socketRef = useRef(null)

  useEffect(() => {
    const s = getSocket?.()
    socketRef.current = s
    if (!s || !connected) return
    if (!gameId) return

    logger.info('useBattleSocket: joining game', { gameId, tuid: user?.id, connected })
    const onJoined = (data) => {
      logger.info('useBattleSocket: joined', data)
      setRole(data?.role || null)
      setReady(true)
    }
    const onState = (st) => {
      logger.debug('useBattleSocket: state update', st)
      logger.info('useBattleSocket: phase=' + st?.phase + ', turn=' + st?.turn)
      setPhase(st?.phase || 'waiting')
      setTurn(st?.turn || null)
      setTimeLeft({ a: st?.players?.a?.timeLeft ?? 25000, b: st?.players?.b?.timeLeft ?? 25000 })
      setPlacingTimeLeft(st?.placingTimeLeft ?? 60000)
      setPlacingTimerStarted(st?.placingTimerStarted ?? false)
    }
    const onToss = (data) => {
      logger.info('useBattleSocket: toss', data)
      setToss({ firstTurn: data?.firstTurn, seed: data?.seed })
    }
  const onMoveResult = (mr) => {
    logger.info('useBattleSocket: move_result', mr)
    setLastMove(mr)
  }
  const onGameOver = (go) => {
    logger.info('useBattleSocket: game_over', go)
    setGameOver(go)
  }
  const onError = (e) => {
    logger.error('useBattleSocket: error', e)
    setLastError(e)
  }

  s.emit('join_game', { gameId, tuid: user?.id })
    s.on('joined', onJoined)
    s.on('state', onState)
    s.on('toss', onToss)
  s.on('move_result', onMoveResult)
  s.on('game_over', onGameOver)
  s.on('error', onError)

    return () => {
      s.off('joined', onJoined)
      s.off('state', onState)
      s.off('toss', onToss)
      s.off('move_result', onMoveResult)
      s.off('game_over', onGameOver)
      s.off('error', onError)
    }
  }, [connected, gameId, getSocket])

  const api = useMemo(() => ({
    useRealtime: !!(connected && ready),
    role,
    phase,
    turn,
    timeLeft,
    placingTimeLeft,
    placingTimerStarted,
  lastMove,
  gameOver,
  lastError,
    toss,
    placeSecret: (cell) => {
      const s = socketRef.current
      if (!s) {
        logger.warn('useBattleSocket: placeSecret called but no socket')
        return
      }
      logger.info('useBattleSocket: → place_secret', { cell })
      s.emit('place_secret', { cell })
    },
    move: (cell, moveId) => {
      const s = socketRef.current
      if (!s) {
        logger.warn('useBattleSocket: move called but no socket')
        return
      }
      logger.info('useBattleSocket: → move', { cell, moveId })
      s.emit('move', { cell, moveId })
    },
  }), [connected, ready, role, phase, turn, timeLeft, placingTimeLeft, placingTimerStarted, lastMove, toss, gameOver, lastError])

  return api
}
