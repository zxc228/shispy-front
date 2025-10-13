import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getBalance } from '../shared/api/wallet.api'
import { logger } from '../shared/logger'

const BalanceContext = createContext({ amount: 0, refresh: async (_force = false) => {} })

export function BalanceProvider({ children }) {
  const [amount, setAmount] = useState(0)
  const lastFetchRef = useRef(0)
  const fetchingRef = useRef(false)

  const fetchBalance = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await getBalance()
      const val = Number(res?.amount ?? 0)
      if (!Number.isNaN(val)) setAmount(val)
    } catch (e) {
      logger.warn('BalanceProvider: getBalance failed', e)
    } finally {
      fetchingRef.current = false
      lastFetchRef.current = Date.now()
    }
  }, [])

  // Public refresh with throttle (min 5s between calls)
  const refresh = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 5000) return
    await fetchBalance()
  }, [fetchBalance])

  // Initial fetch on mount
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Refresh on window focus and visibility change
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

  // Light interval polling (e.g., every 30s) to keep it fresh without overload
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
