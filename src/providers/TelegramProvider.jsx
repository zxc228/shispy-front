import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { initTelegram } from '../lib/telegram'
import { authTelegram } from '../shared/api/auth.api'
import { apiSetAccessToken } from '../shared/api/client'
import { logger } from '../shared/logger'
import { useBalance } from './BalanceProvider'

const TelegramContext = createContext({
  tg: null,
  user: null,
  initData: null,
  initDataUnsafe: null,
  isInTelegram: false,
  authDone: false,
})

export function TelegramProvider({ children }) {
  const balance = (() => { try { return useBalance() } catch { return { refresh: async () => {} } } })()
  const [tg, setTg] = useState(null)
  const [user, setUser] = useState(null)
  const [initData, setInitData] = useState(null)
  const [initDataUnsafe, setInitDataUnsafe] = useState(null)
  const isInTelegram = !!tg
  const [authDone, setAuthDone] = useState(false)

  useEffect(() => {
    const instance = initTelegram()
    setTg(instance)
  }, [])

  useEffect(() => {
    if (!tg) return
    try {
      setUser(tg.initDataUnsafe?.user || null)
      setInitData(tg.initData || null)
      setInitDataUnsafe(tg.initDataUnsafe || null)

      // Subscribe to themeChanged (no-op handler ok)
      const onTheme = () => {}
      tg.onEvent?.('themeChanged', onTheme)
      return () => {
        tg.offEvent?.('themeChanged', onTheme)
      }
    } catch {
      // ignore
    }
  }, [tg])

  // Auto-authenticate once when initData becomes available
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!tg) return
      if (!initData) return
      if (authDone) return
      const existing = (() => { try { return sessionStorage.getItem('access_token') } catch { return null } })()
      if (existing) {
        apiSetAccessToken(existing)
  logger.info('TelegramProvider: token already present, header set')
  // refresh balance immediately
  balance.refresh?.()
        setAuthDone(true)
        return
      }
      try {
        logger.info('TelegramProvider: authenticating via /auth/telegram')
        logger.debug('TelegramProvider: initData', initData)
        const res = await authTelegram(initData)
        if (cancelled) return
        if (res?.access_token) {
          sessionStorage.setItem('access_token', res.access_token)
          apiSetAccessToken(res.access_token)
          setAuthDone(true)
          logger.info('TelegramProvider: token saved and header set')
          // refresh balance immediately
          balance.refresh?.()
        } else {
          logger.warn('TelegramProvider: no access_token in response', res)
        }
      } catch (e) {
        if (cancelled) return
        logger.error('TelegramProvider: auth error', e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [tg, initData, authDone])

  const value = useMemo(
    () => ({ tg, user, initData, initDataUnsafe, isInTelegram, authDone }),
    [tg, user, initData, initDataUnsafe, isInTelegram, authDone]
  )

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
}

export function useTelegram() {
  return useContext(TelegramContext)
}

export default TelegramProvider
