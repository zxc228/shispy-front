export default function StatusBar({ title, showTimer, onExit }) {
  return (
    <div className="px-2.5">
      <div className="w-full py-2 rounded-2xl flex items-center justify-between gap-2">
        <div className="text-xl font-medium leading-none text-neutral-50">{title}</div>
        <div className="flex items-center gap-2">
          {showTimer && (
            <div className="relative inline-flex items-center">
              <span className="absolute left-0 top-0 bottom-0 my-auto w-1 h-3 rounded-full bg-orange-400" />
              <span className="relative rounded-full px-3 py-1 bg-neutral-800 text-white/90 text-xs">00:25</span>
            </div>
          )}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="h-8 px-2.5 rounded-full bg-neutral-800 text-white/90 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
              aria-label="Concede and exit"
            >
              Concede
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
