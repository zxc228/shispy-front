import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LivePage() {
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
          <div className="text-7xl">🎥</div>
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

/*
import { useMemo, useState } from 'react'
import CreateBattleCTA from '../../components/common/CreateBattleCTA'

export default function LivePage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')

  const showUnderConstruction = () => {
    setMessage('Under construction')
    setTimeout(() => setMessage(''), 2000) // Clear message after 2 seconds
  }

  // filters
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'top', label: 'TOP' },
    { id: 'more', label: 'More bid' },
    { id: 'new', label: 'Just started' },
  ]
  const [active, setActive] = useState('all')

  // mock battles
  const battles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        a: {
          name: `player_${i + 1}A`,
          level: 12,
          betTon: 2.1,
          avatar: null,
        },
        b: {
          name: `player_${i + 1}B`,
          level: 16,
          betTon: 2.1,
          avatar: null,
        },
        createdAt: Date.now() - i * 60_000,
      })),
    []
  )

  const filtered = useMemo(() => {
    if (active === 'top') {
      return battles // одинаковые ставки — оставляем как есть
    }
    if (active === 'more') {
      return battles
    }
    if (active === 'new') {
      return battles.slice(0, 6)
    }
    return battles
  }, [active, battles])

  return (
    <div className="min-h-[812px] w-full max-w-[390px] mx-auto bg-black text-white relative">
      {message && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {message}
        </div>
      )}
      <div className="pb-[120px] space-y-4 px-4">
        <SectionHeader title="Live" />
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={[
                  'h-10 px-3 rounded-xl text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
                  active === f.id
                    ? 'bg-neutral-700 text-white'
                    : 'bg-black text-white outline outline-1 outline-neutral-700 hover:bg-neutral-800/40',
                  'transition-transform duration-150 active:scale-[0.99] cursor-pointer',
                ].join(' ')}
                aria-pressed={active === f.id}
                onClick={() => setActive(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 py-1">
          {filtered.map((b) => (
            <BattleCard
              key={b.id}
              battle={b}
              onWatch={() => {
                showUnderConstruction()
              }}
            />
          ))}
        </div>
      </div>
      <CreateBattleCTA onClick={() => navigate('/create')} />
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="w-full py-2 rounded-2xl">
      <h2 className="text-xl font-medium leading-none text-neutral-50">{title}</h2>
    </div>
  )
}

function BattleCard({ battle, onWatch }) {
  const { a, b } = battle
  return (
    <div className="w-full p-3 rounded-xl overflow-hidden bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] outline outline-1 outline-neutral-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)]">
      <div className="flex flex-col items-center gap-5">
        <div className="w-full flex items-start justify-center gap-4">
          <div className="flex flex-1 items-start justify-center gap-2 min-w-0">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[10px] border border-zinc-500 bg-neutral-700 object-cover shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-50">{a.betTon.toFixed(2)}</span>
                <span className="w-3 h-3 bg-sky-500 shrink-0" />
                <span className="w-1.5 h-1.5 bg-white rounded shrink-0" />
              </div>
            </div>
            <div className="w-20 h-12 flex items-center min-w-0">
              <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
                <div className="w-full text-xs font-light text-white truncate [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)]">
                  {a.name}
                </div>
                <div className="text-[10px] text-neutral-700">Level {a.level}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-medium text-orange-400">vs</div>
          </div>
          <div className="flex flex-1 items-start justify-center gap-2 min-w-0">
            <div className="w-20 h-12 flex items-center min-w-0">
              <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
                <div className="w-full text-right text-xs font-light text-white truncate [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)]">
                  {b.name}
                </div>
                <div className="text-right text-[10px] text-neutral-700">Level {b.level}</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[10px] border border-zinc-500 bg-neutral-700 object-cover shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-50">{b.betTon.toFixed(2)}</span>
                <span className="w-3 h-3 bg-sky-500 shrink-0" />
                <span className="w-1.5 h-1.5 bg-white rounded shrink-0" />
              </div>
            </div>
          </div>
        </div>
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-l from-amber-600 to-neutral-800" />
          <button
            type="button"
            onClick={onWatch}
            className="h-12 px-4 py-3 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] text-base font-semibold text-white [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 cursor-pointer"
          >
            Watch now
          </button>
          <div className="flex-1 h-px bg-gradient-to-l from-neutral-800 to-amber-600" />
        </div>
      </div>
    </div>
  )
}
*/
