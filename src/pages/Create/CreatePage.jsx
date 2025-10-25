import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyGiftSvg from '../../components/icons/EmptyGift.svg'
import TonSvg from '../../components/icons/TonIcon.svg'
import { getGifts, createBattle } from '../../shared/api/lobby.api'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'

/** @typedef {{ id: string; image?: string|null; priceTON: number }} Treasure */

export default function CreatePage({ onAddTreasure, onCreateBattle }) {
  const navigate = useNavigate()
  const { withLoading } = useLoading()

  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        const res = await withLoading(() => getGifts())
        if (cancelled) return
        const gifts = Array.isArray(res?.gifts) ? res.gifts : []
        const mapped = gifts.map((g) => ({
          id: String(g?.gid ?? ''),
          image: g?.photo || null,
          priceTON: Number(g?.value ?? 0),
        }))
        setInventory(mapped)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const defaultView = inventory.length === 0 ? 'empty' : 'choose'
  const [view, setView] = useState(defaultView)

  useEffect(() => {
    // when inventory arrives, switch to choose view automatically
    if (inventory.length > 0 && view !== 'choose') {
      setView('choose')
    }
  }, [inventory])
  const [selectedIds, setSelectedIds] = useState([])

  const selectedCount = selectedIds.length
  const totalTon = useMemo(() => {
    const sum = selectedIds
      .map((id) => inventory.find((t) => t.id === id)?.priceTON ?? 0)
      .reduce((a, b) => a + b, 0)
    return Number(sum.toFixed(2))
  }, [selectedIds, inventory])

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleAddTreasure = () => {
    if (onAddTreasure) onAddTreasure()
    else navigate('/treasure')
  }

  const handleCreate = async () => {
    if (!selectedCount) return
    const giftIds = selectedIds.map((id) => Number(id)).filter((n) => Number.isFinite(n))
    logger.debug('CreatePage: createBattle payload', { gifts: giftIds })
    const res = await withLoading(() => createBattle(giftIds))
    logger.debug('CreatePage: createBattle response', res)
    if (res?.status) {
      // Save bet to sessionStorage for battle page to show on loss
      const selectedGifts = selectedIds.map(id => inventory.find(t => t.id === id)).filter(Boolean)
      const betData = {
        gifts: selectedGifts.map(g => ({ gid: Number(g.id), value: g.priceTON, slug: `gift-${g.id}`, photo: g.image || '' })),
        total: totalTon
      }
      // We don't know game_id yet, so save with a temp key and update in lobby
      sessionStorage.setItem('pending_bet', JSON.stringify(betData))
      
      if (onCreateBattle) onCreateBattle(selectedIds)
      navigate('/lobby/waiting', { replace: true })
    }
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-black text-white flex flex-col">
      {/* scroll area (контент), сохраняем «гуттер» скроллбара */}
      <main className="flex-1 overflow-y-auto px-2.5 pt-2 pb-[calc(152px+env(safe-area-inset-bottom))] [scrollbar-gutter:stable_both-edges]">
        {view === 'empty' ? (
          <EmptyInventoryBlock
            onAddTreasure={() => {
              setView('choose')
              handleAddTreasure()
            }}
          />
        ) : (
          <div className="space-y-3">
            <h2 className="px-1 text-xl font-medium leading-none text-neutral-50">
              Choose Treasure
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

      {/* summary footer */}
      <SummaryFooter
        selectedCount={selectedCount}
        totalTon={totalTon}
        onCreate={handleCreate}
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
            <span className="text-neutral-50">
              You can add your Treasure or{' '}
            </span>
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
      aria-pressed={selected}
      onClick={onToggle}
      className={`relative ${baseSize} rounded-[10px] border border-zinc-500 overflow-hidden active:scale-95 transition-transform`}
    >
      {treasure?.image ? (
        <div className="w-full h-full p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={treasure.image}
            alt="Treasure"
            className="w-full h-full object-cover rounded-[8px]"
          />
        </div>
      ) : (
        <div className="w-full h-full bg-neutral-700 grid place-items-center p-2">
          <img src={EmptyGiftSvg} alt="Treasure placeholder" className="w-10 h-10 opacity-80" />
        </div>
      )}

      {/* выбранное состояние — как в dev-mode: градиентный подсвет + рамка 2px */}
      {selected && (
        <span className="absolute inset-0 rounded-[10px] pointer-events-none bg-orange-400/25 shadow-[0_0_25px_0_rgba(200,109,55,0.50)] border-2 border-orange-400" />
      )}
    </button>
  )
}

function SummaryFooter({ selectedCount, totalTon, onCreate }) {
  const disabled = selectedCount === 0
  return (
  <div className="fixed left-0 right-0 bottom-[calc(56px+env(safe-area-inset-bottom))] w-full z-40 px-2.5">
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
                <span className="text-white text-base font-bold">
                  {totalTon.toFixed(2)} TON
                </span>
              </div>
            </div>
          </div>

          <div className="mt-1 text-neutral-700 text-sm">
            Fixed game commission of 0.2 TON
          </div>

          <div className="mt-1.5 relative">
            {!disabled && (
              <div className="absolute inset-0 h-11 p-2.5 bg-gradient-to-b from-orange-400/75 to-amber-700/75 rounded-xl blur-[2.5px] -z-10 pointer-events-none" />
            )}
            <button
              type="button"
              aria-label={disabled ? 'Create Battle' : 'Create'}
              disabled={disabled}
              onClick={onCreate}
              className={[
                'w-full h-11 px-4 py-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
                disabled
                  ? 'bg-zinc-100/25 text-zinc-500 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.10)] cursor-not-allowed'
                  : 'bg-gradient-to-b from-orange-400 to-amber-700 text-white shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] transition-transform duration-150',
              ].join(' ')}
            >
              {disabled ? 'Create Battle' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

