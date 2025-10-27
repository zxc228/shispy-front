export default function StatusBar({ title, showTimer, secondsLeft = 0, maxTime = 25 }) {
  const mm = String(Math.floor(Math.max(0, secondsLeft) / 60)).padStart(2, '0')
  const ss = String(Math.max(0, secondsLeft) % 60).padStart(2, '0')
  // Progress bar: calculate percentage based on maxTime
  const percentage = Math.min(100, Math.max(0, (secondsLeft / maxTime) * 100))
  const isLowTime = secondsLeft <= 5
  
  return (
    <div className="px-2.5">
      <div className="w-full py-2 rounded-2xl flex flex-col gap-2">
        {/* Title and controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xl font-medium leading-none text-neutral-50">{title}</div>
          <div className="flex items-center gap-2">
            {showTimer && (
              <div className="relative inline-flex items-center gap-2">
                <span className={`text-sm font-bold tabular-nums ${isLowTime ? 'text-red-400 animate-pulse' : 'text-white/90'}`}>
                  {mm}:{ss}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        {showTimer && (
          <div className="w-full h-1.5 rounded-full bg-neutral-800/80 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                isLowTime ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-orange-400 to-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
