import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getBalance } from '../shared/api/users.api'
import { logger } from '../shared/logger'
import { getToken } from '../shared/api/client'

const BalanceContext = createContext({ amount: 0, refresh: async (_force = false) => {} })

export function BalanceProvider({ children }) {
  const [amount, setAmount] = useState(0)
  const lastFetchRef = useRef(0)
  const fetchingRef = useRef(false)

  const fetchBalance = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const data = await getBalance()
      setAmount(data.amount ?? 0)
      logger.info('BalanceProvider: Balance fetched', data.amount)
    } catch (e) {
      logger.warn('BalanceProvider: getBalance failed', e)
    } finally {
      fetchingRef.current = false
      lastFetchRef.current = Date.now()
    }
  }, [])

  // Public refresh with throttle (min 5s between calls)
  const refresh = useCallback(async (force = false) => {
    if (!getToken()) return
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 5000) return
    await fetchBalance()
  }, [fetchBalance])

  // Initial fetch on mount
  useEffect(() => {
    if (getToken()) fetchBalance()
  }, [fetchBalance])

  // Refresh on window focus
  useEffect(() => {
    const onFocus = () => refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  // Light interval polling (every 30s)
  useEffect(() => {
    const id = setInterval(() => { refresh() }, 30000)
    return () => clearInterval(id)
  }, [refresh])

  const value = useMemo(() => ({ amount, refresh }), [amount, refresh])
  return (
    <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
  )
}

export function useBalance() {
  return useContext(BalanceContext)
}
