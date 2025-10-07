import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/** @typedef {{ id: string; image?: string|null; priceTON: number }} Treasure */

export default function CreatePage({ onAddTreasure, onCreateBattle }) {
  const navigate = useNavigate()

  // mock inventory
  const inventory = useMemo(
    () =>
      /** @type {Treasure[]} */ ([
        { id: 't1', image: null, priceTON: 25 },
        { id: 't2', image: null, priceTON: 25 },
        { id: 't3', image: null, priceTON: 50 },
        { id: 't4', image: null, priceTON: 10 },
        { id: 't5', image: null, priceTON: 2.1 },
        { id: 't6', image: null, priceTON: 2.1 },
        { id: 't7', image: null, priceTON: 2.1 },
        { id: 't8', image: null, priceTON: 2.1 },
        { id: 't9', image: null, priceTON: 2.1 },
      ]),
    []
  )

  const defaultView = inventory.length === 0 ? 'empty' : 'choose'
  const [view, setView] = useState(defaultView)
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

  const handleCreate = () => {
    if (!selectedCount) return
    const battleId = Math.random().toString(36).slice(2, 8)
    if (onCreateBattle) onCreateBattle(selectedIds)
    navigate(`/lobby/battle/${battleId}`)
  }

  return (
    <div className="h-[100dvh] w-full max-w-[390px] mx-auto bg-black text-white relative overflow-hidden">
      {/* scroll area (контент), сохраняем «гуттер» скроллбара */}
      <div className="absolute inset-x-0 top-0 bottom-[calc(136px+env(safe-area-inset-bottom))] overflow-y-auto px-2.5 pt-2 pb-4 [scrollbar-gutter:stable_both-edges]">
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
      </div>

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
    { type: 'empty' },
    { type: 'empty' },
  ]
  return (
    <div className="grid grid-cols-3 gap-1">
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
        if (c.type === 'empty') {
          return (
            <TreasureCard
              key={`empty-${idx}`}
              variant="empty"
              selected={false}
              onToggle={() => {}}
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
  const baseSize = 'w-28 h-32'
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
      <div
        className={`${baseSize} rounded-[10px] border border-neutral-700 bg-neutral-800/30`}
      />
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={treasure.image}
          alt="Treasure"
          className="w-full h-full object-cover rounded-[10px]"
        />
      ) : (
        <div className="w-full h-full bg-neutral-700" />
      )}

      {/* выбранное состояние — как в dev-mode: градиентный подсвет + рамка 2px */}
      {selected && (
        <span className="absolute inset-0 rounded-[10px] pointer-events-none bg-gradient-to-b from-orange-400/0 to-orange-400/20 shadow-[0_0_25px_0_rgba(200,109,55,0.50)] border-2 border-orange-400" />
      )}
    </button>
  )
}

function SummaryFooter({ selectedCount, totalTon, onCreate }) {
  const disabled = selectedCount === 0
  return (
    <div className="fixed left-0 right-0 bottom-[calc(88px+env(safe-area-inset-bottom))] w-full z-40 px-2.5">
      <div className="mx-auto max-w-[390px] relative">
        <div className="rounded-2xl outline outline-1 outline-offset-[-1px] outline-neutral-700 pt-3 px-3 pb-3 bg-[radial-gradient(ellipse_62.58%_57.57%_at_80.72%_0%,_rgba(34,34,34,.5)_0%,_rgba(17,17,17,.5)_100%)]">
          <div className="flex items-center justify-between">
            <div className="text-neutral-700 text-base font-medium">Selected:</div>
            <div className="inline-flex items-center gap-2">
              <div className="text-neutral-50 text-lg font-medium">
                {selectedCount} {selectedCount === 1 ? 'gift' : 'gifts'}
              </div>
              <div className="h-8 px-2.5 py-2 bg-black rounded-xl inline-flex items-center gap-1">
                {/* TON икон-слоты как в макете (голубой квадратик + белая точка) */}
                <span className="w-3 h-3 bg-sky-500" />
                <span className="w-1.5 h-1.5 bg-white rounded" />
                <span className="text-white text-lg font-bold">
                  {totalTon.toFixed(2)} TON
                </span>
              </div>
            </div>
          </div>

          <div className="mt-1 text-neutral-700 text-sm">
            Fixed game commission of 0.2 TON
          </div>

          <div className="mt-2 relative">
            {!disabled && (
              <div className="absolute inset-0 h-12 p-3 bg-gradient-to-b from-orange-400/75 to-amber-700/75 rounded-xl blur-[2.5px] -z-10 pointer-events-none" />
            )}
            <button
              type="button"
              aria-label={disabled ? 'Create Battle' : 'Join'}
              disabled={disabled}
              onClick={onCreate}
              className={[
                'w-full h-12 px-4 py-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
                disabled
                  ? 'bg-zinc-100/25 text-zinc-500 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.10)] cursor-not-allowed'
                  : 'bg-gradient-to-b from-orange-400 to-amber-700 text-white shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] transition-transform duration-150',
              ].join(' ')}
            >
              {disabled ? 'Create Battle' : 'Join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

