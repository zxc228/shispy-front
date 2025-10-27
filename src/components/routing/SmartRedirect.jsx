import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { logger } from '../../shared/logger'
import { getWaitingStatus, cancelLobby } from '../../shared/api/lobby.api'
import { useTelegram } from '../../providers/TelegramProvider'

/**
 * SmartRedirect - Redirects to active game if exists, otherwise to profile
 */
export default function SmartRedirect() {
  const [redirectPath, setRedirectPath] = useState(null)
  const [checking, setChecking] = useState(true)
  const { authDone } = (() => { try { return useTelegram() } catch { return { authDone: true } } })()

  useEffect(() => {
    // Fast path 1: if sessionStorage hints we have an active game, redirect immediately
    const localId = sessionStorage.getItem('active_game_id')
    if (localId) {
      logger.info('SmartRedirect: using sessionStorage active game id', { gameId: localId })
      setRedirectPath(`/lobby/battle/${localId}`)
      setChecking(false)
      return
    }

    // Fast path 2: if there is a pending bet (search started), go to waiting screen
    const pending = sessionStorage.getItem('pending_bet')
    if (pending) {
      // Check timeout: if more than 60s passed since search started, cancel search
      const startedAt = Number(sessionStorage.getItem('search_started_at') || '0')
      const expired = startedAt > 0 && Date.now() - startedAt > 60_000
      if (expired) {
        (async () => {
          logger.info('SmartRedirect: search expired (>60s). Cancelling lobby and clearing state')
          try { await cancelLobby() } catch {}
          try {
            sessionStorage.removeItem('pending_bet')
            sessionStorage.removeItem('search_started_at')
          } catch {}
          setRedirectPath('/lobby')
          setChecking(false)
        })()
        return
      }
      logger.info('SmartRedirect: pending bet detected, redirecting to waiting screen')
      setRedirectPath('/lobby/waiting')
      setChecking(false)
      return
    }

    // Otherwise, wait for auth and confirm with API
    if (!authDone) {
      logger.debug?.('SmartRedirect: waiting for auth before checking active game')
      return
    }

    let cancelled = false
    const checkActiveGame = async () => {
      try {
        const response = await getWaitingStatus()
        if (cancelled) return
        const { status, game_id } = response
        if (status === -1 && game_id > 0) {
          logger.info('SmartRedirect: found active game from API, redirecting', { gameId: game_id })
          setRedirectPath(`/lobby/battle/${game_id}`)
        } else if (!!status) {
          // Searching (queued) status is truthy but not -1 -> go to waiting
          logger.info('SmartRedirect: search in progress, redirecting to waiting screen', { status })
          setRedirectPath('/lobby/waiting')
        } else {
          logger.info('SmartRedirect: no active game, redirecting to profile', { status, game_id })
          setRedirectPath('/profile')
        }
      } catch (error) {
        if (cancelled) return
        logger.error('SmartRedirect: failed to check waiting status', error)
        setRedirectPath('/profile')
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    checkActiveGame()
    return () => { cancelled = true }
  }, [authDone])

  // Wait for check to complete
  if (checking) {
    return null
  }

  return <Navigate to={redirectPath} replace />
}
