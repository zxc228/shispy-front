import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MapPage() {
  const navigate = useNavigate()

  // Disable scrolling on this page by turning off overflow on the shared <main>
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const prevOverflowY = main.style.overflowY
    const prevScrollbarGutter = main.style.scrollbarGutter
    main.style.overflowY = 'hidden'
    // avoid reserving gutter on this page
    main.style.scrollbarGutter = 'auto'
    return () => {
      main.style.overflowY = prevOverflowY
      main.style.scrollbarGutter = prevScrollbarGutter
    }
  }, [])

  return (
    <div className="min-h-[812px] w-full max-w-[390px] mx-auto bg-black text-white relative">
  {/* Контентный контейнер без скролла */}
  <div className="px-2.5 pb-0">
        {/* Небольшой зазор под хедером уже создаётся padding-ом контейнера */}

        {/* Пустое состояние */}
        <div className="w-80 mx-auto min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="text-7xl">🗺️</div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-neutral-50 text-xl font-medium text-center">
              The mode is under development now.
            </div>
            <div className="text-neutral-50 text-base text-center">
              Stay tuned for updates on our Telegram channel{' '}
              <span className="text-orange-400">@ShipsyChannel</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA-кнопка (над таббаром), с учётом safe area */}
      <div className="fixed left-0 right-0 bottom-[calc(88px+env(safe-area-inset-bottom))] w-full px-2.5 z-40">
        <div className="mx-auto max-w-[390px] relative">
          {/* glow под кнопкой (не перекрывает клики) */}
          <div className="absolute inset-0 h-12 p-3 bg-gradient-to-b from-orange-400/75 to-amber-700/75 rounded-xl blur-[2.5px] -z-10 pointer-events-none" />
          <button
            type="button"
            aria-label="Go to the lobby"
            onClick={() => navigate('/lobby')}
            className="w-full h-12 px-4 py-3 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] text-base font-semibold text-white [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 active:translate-y-[0.5px] transition-transform duration-150"
          >
            Go to the lobby
          </button>
        </div>
      </div>
    </div>
  )
}
