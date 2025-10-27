import { useEffect, useState } from 'react'

/**
 * ConnectionError - Shows reconnection screen when network fails
 */
export default function ConnectionError({ show, onRetry, errorDetails }) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (!show) return
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [show])

  if (!show) return null

  const title = errorDetails?.title || 'Connection Lost'
  const message = errorDetails?.message || 'Please check your internet connection and try again'

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col items-center max-w-[320px] px-4">
        {/* Error icon with pulse */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-400/20 to-orange-600/20 flex items-center justify-center">
            <div className="text-6xl animate-pulse">
              ⚠️
            </div>
          </div>
          {/* Error ripple */}
          <div className="absolute inset-0 rounded-full border-4 border-red-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2 text-center text-white">
          {title}
        </h1>

        {/* Message */}
        <p className="text-neutral-400 text-center mb-6 text-sm leading-relaxed">
          {message}{dots}
        </p>

        {/* Retry button */}
        <button
          onClick={onRetry}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] text-white font-semibold hover:opacity-90 active:translate-y-[0.5px] transition-all"
        >
          Retry Connection
        </button>

        {/* Tips */}
        <div className="mt-6 space-y-2 text-sm text-neutral-500 text-center">
          <p>• Check your WiFi or mobile data</p>
          <p>• Try refreshing the page</p>
          <p>• Contact support if issue persists</p>
        </div>
      </div>
    </div>
  )
}
