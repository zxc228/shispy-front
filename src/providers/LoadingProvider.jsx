import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

const LoadingContext = createContext({
  loading: false,
  show: () => {},
  hide: () => {},
  withLoading: async (fn) => await fn(),
})

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false)

  const show = useCallback(() => setLoading(true), [])
  const hide = useCallback(() => setLoading(false), [])
  const withLoading = useCallback(async (fn) => {
    try {
      setLoading(true)
      return await fn()
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo(() => ({ loading, show, hide, withLoading }), [loading, show, hide, withLoading])

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  )
}

export function useLoading() {
  return useContext(LoadingContext)
}
