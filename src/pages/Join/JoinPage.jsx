import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EmptyGiftSvg from '../../components/icons/EmptyGift.svg'
import TonSvg from '../../components/icons/TonIcon.svg'
import { getGifts, joinBattle } from '../../shared/api/lobby.api'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'
import { transformGiftsData } from '../../shared/utils/gifts'
import TgsSticker from '../../components/common/TgsSticker'

/** @typedef {{ id: string; gid: string; slug: string; value: number; tgsUrl: string }} Treasure */

export default function JoinPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { withLoading } = useLoading()

  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [joiningBattle, setJoiningBattle] = useState(false) // Loading state for join animation

  // Load available gifts (same as CreatePage)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        const res = await withLoading(() => getGifts())
        if (cancelled) return
        // getGifts() возвращает массив [{ gid, value, slug }]
        const gifts = Array.isArray(res) ? res : (Array.isArray(res?.gifts) ? res.gifts : Array.isArray(res?.data) ? res.data : [])
        logger.debug('JoinPage: getGifts result', { res, giftsCount: gifts.length })
        // Используем transformGiftsData для генерации tgsUrl (как в TreasurePage)
        const transformed = transformGiftsData(gifts)
        logger.debug('JoinPage: transformed inventory', { count: transformed.length, sample: transformed[0] })
        setInventory(transformed)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const [view, setView] = useState('choose') // Всегда стартуем с 'choose', чтобы показать skeleton
  const [selectedIds, setSelectedIds] = useState([])

  // Когда инвентарь загрузился — переключаем view
  useEffect(() => {
    if (!loading && inventory.length === 0) {
      setView('empty')
    } else if (!loading && inventory.length > 0) {
      setView('choose')
    }
  }, [loading, inventory.length])

  const selectedCount = selectedIds.length
  const totalTon = useMemo(() => {
    const sum = selectedIds
      .map((tid) => inventory.find((t) => t.id === tid)?.value ?? 0)
      .reduce((a, b) => a + b, 0)
    return Number(sum.toFixed(2))
  }, [selectedIds, inventory])

  const toggleSelect = (tid) => {
    setSelectedIds((prev) =>
      prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]
    )
  }

  const handleAddTreasure = () => {
    navigate('/treasure')
  }

  const handleJoin = async () => {
    if (!selectedCount) return
    // Backend expects array of gid strings
    const giftIds = [...selectedIds]
    const quequeId = Number(id)
    if (!Number.isFinite(quequeId)) {
      logger.warn('JoinPage: invalid queque_id from route param', { id })
      return
    }
    
    setJoiningBattle(true) // Show loading animation
    
    try {
      logger.debug('JoinPage: joinBattle payload', { gifts: giftIds, queque_id: quequeId })
      const res = await withLoading(() => joinBattle(giftIds, quequeId))
      logger.debug('JoinPage: joinBattle response', res)
      const gameId = res?.game_id
      if (Number.isFinite(gameId)) {
        // Save bet to sessionStorage for battle page to show on loss
        const selectedGifts = selectedIds.map(tid => inventory.find(t => t.id === tid)).filter(Boolean)
        const betData = {
          gifts: selectedGifts.map(g => ({ gid: String(g.id), value: g.value, slug: g.slug, tgsUrl: g.tgsUrl })),
          total: totalTon
        }
        sessionStorage.setItem(`battle_bet_${gameId}`, JSON.stringify(betData))
        
        // Wait 1.5s to show success animation
        setTimeout(() => {
          navigate(`/lobby/battle/${gameId}`)
        }, 1500)
      } else {
        // Fallback: go back to lobby if no game_id returned
        setJoiningBattle(false)
        navigate('/lobby')
      }
    } catch (e) {
      logger.error('JoinPage: joinBattle error', e)
      setJoiningBattle(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-black text-white flex flex-col relative">
      {/* Joining battle overlay */}
      {joiningBattle && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-[fadeIn_0.3s_ease-out]">
          <div className="flex flex-col items-center">
            <div className="mb-8 relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center">
                <div className="text-6xl animate-[bounce_0.6s_ease-in-out_infinite]">
                  ⚔️
                </div>
              </div>
              {/* Success ripple */}
              <div className="absolute inset-0 rounded-full border-4 border-green-400/50 animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-green-400 animate-[slideUp_0.5s_ease-out]">
              Joining Battle!
            </h1>
            <p className="text-neutral-300 text-center animate-[slideUp_0.5s_ease-out_0.1s_both]">
              Preparing your strategy...
            </p>
          </div>
        </div>
      )}
      
      {/* scroll area */}
      <main className="flex-1 overflow-y-auto px-2.5 pt-2 pb-[calc(184px+env(safe-area-inset-bottom))] [scrollbar-gutter:stable_both-edges]">
        {loading ? (
          // Skeleton loading state
          <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
            <div className="px-1 h-6 w-32 bg-neutral-800/50 rounded animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-neutral-800/50 animate-pulse" />
              ))}
            </div>
          </div>
        ) : view === 'empty' ? (
          <EmptyInventoryBlock
            onAddTreasure={() => {
              setView('choose')
              handleAddTreasure()
            }}
          />
        ) : (
          <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
            <h2 className="px-1 text-xl font-medium leading-none text-neutral-50">
              Join Battle
            </h2>
            <TreasurePickerGrid
              inventory={inventory}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onAddTreasure={handleAddTreasure}
            />
          </div>
        )}
      </main>

      {/* footer with Join button */}
      <SummaryFooter
        selectedCount={selectedCount}
        totalTon={totalTon}
        onJoin={handleJoin}
      />
    </div>
  )
}

function EmptyInventoryBlock({ onAddTreasure }) {
  return (
    <div className="h-full min-h-[480px] flex items-center justify-center">
      <div className="w-80 mx-auto flex flex-col items-center gap-4">
        <div className="text-7xl">😔</div>
        <div className="text-center">
          <div className="text-neutral-50 text-xl font-medium leading-snug">
            Inventory empty
          </div>
          <div className="text-base leading-snug">
            <span className="text-neutral-50">You can add your Treasure or </span>
            <span className="text-orange-400">buy them in the store</span>
          </div>
        </div>
        <button
          onClick={onAddTreasure}
          className="h-12 px-4 py-3 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] text-base font-semibold text-white [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
        >
          Click here to add Treasure
        </button>
      </div>
    </div>
  )
}

function TreasurePickerGrid({ inventory, selectedIds, onToggle, onAddTreasure }) {
  const cards = [
    { type: 'add' },
    ...inventory.map((t) => ({ type: 'item', data: t })),
  ]
  return (
    <div className="grid grid-cols-3 gap-2 place-items-center">
      {cards.map((c, idx) => {
        if (c.type === 'add') {
          return (
            <TreasureCard
              key={`add-${idx}`}
              variant="add"
              selected={false}
              onToggle={() => onAddTreasure()}
            />
          )
        }
        const t = c.data
        const sel = selectedIds.includes(t.id)
        return (
          <TreasureCard
            key={t.id}
            variant="item"
            treasure={t}
            selected={sel}
            onToggle={() => onToggle(t.id)}
          />
        )
      })}
    </div>
  )
}

function TreasureCard({ variant, treasure, selected, onToggle }) {
  const baseSize = 'w-24 h-28'
  if (variant === 'add') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`${baseSize} relative bg-black rounded-[10px] outline outline-1 outline-offset-[-1px] outline-orange-400 overflow-hidden active:scale-95 transition-transform`}
      >
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-400 text-base font-medium text-center">
          Add new Treasure
        </span>
      </button>
    )
  }

  if (variant === 'empty') {
    return (
      <div className={`${baseSize} rounded-[10px] border border-neutral-700 bg-neutral-800/30 p-2`} />
    )
  }

  // item
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onToggle}
      className={`relative ${baseSize} rounded-[10px] border border-zinc-500 overflow-hidden active:scale-95 transition-transform`}
    >
      {treasure?.tgsUrl ? (
        <div className="w-full h-full grid place-items-center p-2">
          <TgsSticker
            src={treasure.tgsUrl}
            width={60}
            height={60}
            loop={true}
            autoplay={true}
            className="opacity-90"
          />
        </div>
      ) : (
        <div className="w-full h-full bg-neutral-700 grid place-items-center p-2">
          <img src={EmptyGiftSvg} alt="Treasure placeholder" className="w-10 h-10 opacity-80" />
        </div>
      )}
      {selected && (
        <span className="absolute inset-0 rounded-[10px] pointer-events-none bg-orange-400/25 shadow-[0_0_25px_0_rgba(200,109,55,0.50)] border-2 border-orange-400" />
      )}
    </button>
  )
}

function SummaryFooter({ selectedCount, totalTon, onJoin }) {
  const disabled = selectedCount === 0
  return (
  <div className="fixed left-0 right-0 bottom-[calc(88px+env(safe-area-inset-bottom))] w-full z-40 px-2.5">
      <div className="mx-auto max-w-[390px] relative">
        <div className="rounded-2xl border border-neutral-700 pt-2 px-3 pb-2 bg-neutral-900">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="text-neutral-700 text-sm font-medium">Selected:</div>
            <div className="inline-flex items-center gap-2">
              <div className="text-neutral-50 text-lg font-medium">
                {selectedCount} {selectedCount === 1 ? 'gift' : 'gifts'}
              </div>
              <div className="h-7 px-2 bg-black rounded-xl inline-flex items-center gap-1.5 shrink-0">
                <img src={TonSvg} alt="TON" className="w-4 h-4 object-contain" />
                <span className="text-white text-base font-bold">{totalTon.toFixed(2)} TON</span>
              </div>
            </div>
          </div>
          <div className="mt-1.5 relative">
            {!disabled && (
              <div className="absolute inset-0 h-11 p-2.5 bg-gradient-to-b from-orange-400/75 to-amber-700/75 rounded-xl blur-[2.5px] -z-10 pointer-events-none" />
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={onJoin}
              className={[
                'w-full h-11 px-4 py-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
                disabled
                  ? 'bg-zinc-100/25 text-zinc-500 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.10)] cursor-not-allowed'
                  : 'bg-gradient-to-b from-orange-400 to-amber-700 text-white shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] transition-transform duration-150',
              ].join(' ')}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

