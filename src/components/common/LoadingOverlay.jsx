import React, { useState } from 'react'
import loadingGifUrl from '../animations/Loading.gif?url'

export default function LoadingOverlay({ show }) {
  const [fallback, setFallback] = useState(false)
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40">
      {fallback ? (
        <div className="w-10 h-10 border-4 border-white/80 border-t-transparent rounded-full animate-spin" />
      ) : (
        <img src={loadingGifUrl} alt="Loading" className="w-16 h-16" onError={() => setFallback(true)} />
      )}
    </div>
  )
}
