import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatusBar from './StatusBar'
import TonSvg from '../../components/icons/TonIcon.svg'
import EmptyGiftSvg from '../../components/icons/EmptyGift.svg'
import BattleCell from './BattleCell'
import { getWaitingStatus, setTreasureField, step as apiStep } from '../../shared/api/lobby.api'
import { logger } from '../../shared/logger'
import { useTelegram } from '../../providers/TelegramProvider'

/** @typedef {"idle"|"selected"|"hit"|"miss"|"disabled"} CellState */
/** @typedef {"selectShip"|"selectShipSelected"|"selectShipWaiting"|"myTurn"|"myTurnSelected"|"myTurnFiring"|"myTurnMiss"|"enemyTurn"|"myTurnHit"|"win"} BattleMode */

export default function BattlePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const TIMER_ENABLED = false
  const [mode, setMode] = useState(/** @type {BattleMode} */('selectShip'))
  const [grid, setGrid] = useState(() => Array.from({ length: 16 }, (_, i) => ({ id: i, state: /** @type {CellState} */('idle') })))
  const [selectedShipIds, setSelectedShipIds] = useState(/** @type {number[]} */([]))
  const [selectedTargetId, setSelectedTargetId] = useState(/** @type {number|null} */(null))
  const [sheet, setSheet] = useState(/** @type {null|{variant:'win'|'lose', amount:number, gifts?: any[]}} */(null))
  const [firstWinTriggered, setFirstWinTriggered] = useState(false)
  const pollingRef = useRef(/** @type {any} */(null))
  const gameId = useMemo(() => Number(id), [id])
  const [secondsLeft, setSecondsLeft] = useState(25)
  const { user } = useTelegram?.() || { user: null }

  // derived title and CTA
  const { title, showTimer } = useMemo(() => {
    switch (mode) {
      case 'selectShip':
      case 'selectShipSelected':
        return { title: 'Select a cell', showTimer: false }
      case 'selectShipWaiting':
        return { title: 'Expecting a player', showTimer: true }
      case 'myTurn':
      case 'myTurnSelected':
        return { title: 'Your move', showTimer: true }
      case 'myTurnFiring':
      case 'myTurnMiss':
      case 'myTurnHit':
        return { title: 'Resolving…', showTimer: true }
      case 'enemyTurn':
        return { title: 'Waiting enemy move', showTimer: true }
      case 'win':
        return { title: 'Victory', showTimer: false }
      default:
        return { title: 'Battle', showTimer: false }
    }
  }, [mode])

  // disable interactions in these modes
  const gridDisabled = ['selectShipWaiting', 'myTurnFiring', 'enemyTurn', 'win'].includes(mode)

  // Poll game status to detect if opponent ended the game
  useEffect(() => {
    let cancelled = false
    if (!Number.isFinite(gameId)) return
    // Only poll while game is active and we haven't won yet
    if (sheet?.variant === 'win') return
    const tick = async () => {
      try {
        const res = await getWaitingStatus()
        if (cancelled) return
        // In-game: backend returns { status: -1, game_id }
        if (res && typeof res.status !== 'undefined') {
          if (res.status === -1) {
            // still in some game; if different game id, ignore
            if (Number(res.game_id) !== gameId) {
              // another game started; we can navigate to that game
              // but to be safe, ignore auto-navigation here
            }
          } else {
            // Not in game anymore -> if we haven't won, treat as lose
            if (!sheet) {
              setSheet({ variant: 'lose', amount: 0 })
            }
          }
        }
      } catch (e) {
        // ignore transient errors
      } finally {
        if (!cancelled) pollingRef.current = setTimeout(tick, 3000)
      }
    }
    tick()
    return () => { cancelled = true; if (pollingRef.current) clearTimeout(pollingRef.current) }
  }, [gameId, sheet])

  // Turn timer: run countdown on relevant modes
  useEffect(() => {
    if (!TIMER_ENABLED) return
    const timedModes = new Set(['myTurn', 'myTurnSelected', 'myTurnFiring', 'enemyTurn'])
    if (!timedModes.has(mode)) return
    setSecondsLeft(25)
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [mode])

  const handleCellClick = (cellId) => {
    if (gridDisabled) return
    if (mode === 'selectShip' || mode === 'selectShipSelected') {
      // Allow selecting exactly one treasure cell
      setSelectedShipIds((prev) => {
        const next = prev.includes(cellId) ? [] : [cellId]
        setGrid((g) => g.map((c) => ({ ...c, state: next.includes(c.id) ? 'selected' : 'idle' })))
        setMode(next.length ? 'selectShipSelected' : 'selectShip')
        return next
      })
      return
    }
    if (mode === 'myTurn' || mode === 'myTurnSelected') {
      setSelectedTargetId((prev) => (prev === cellId ? null : cellId))
      setMode((prev) => (prev === 'myTurnSelected' && selectedTargetId === cellId ? 'myTurn' : 'myTurnSelected'))
      return
    }
  }

  const onConfirm = async () => {
    if (!selectedShipIds.length || !Number.isFinite(gameId)) {
      logger.warn('BattlePage: setTreasureField skipped — invalid state', { selectedShipIds, gameId })
      return
    }
    try {
      setMode('selectShipWaiting')
      const treasureCell = selectedShipIds[0]
      logger.debug('BattlePage: setTreasureField request', { gameId, field: treasureCell })
      // Retry up to 3 times on transient 5xx
      let res
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          res = await setTreasureField(gameId, treasureCell)
          break
        } catch (e) {
          const status = e?.status || e?.original?.status
          if (status && status >= 500 && status < 600 && attempt < 3) {
            await new Promise((r) => setTimeout(r, 300 * attempt))
            continue
          }
          throw e
        }
      }
      logger.debug('BattlePage: setTreasureField response', res)
      // proceed regardless of response status to avoid blocking UI
      setMode('myTurn')
    } catch (e) {
      // fallback to allow playing; keep going
      logger.error('BattlePage: setTreasureField error', e)
      setMode('myTurn')
    }
  }

  const onFire = async () => {
    if (selectedTargetId == null || !Number.isFinite(gameId)) return
    const fireAt = selectedTargetId
    setMode('myTurnFiring')
    try {
      // Retry step up to 2 times on 5xx; step is idempotent if server failed before state write
      let res
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const currentTuid = (user && typeof user.id !== 'undefined') ? Number(user.id) : undefined
          res = await apiStep(gameId, fireAt, currentTuid)
          break
        } catch (e) {
          const status = e?.status || e?.original?.status
          if (status && status >= 500 && status < 600 && attempt < 2) {
            await new Promise((r) => setTimeout(r, 250 * attempt))
            continue
          }
          throw e
        }
      }
      // If array => win with gifts
      if (Array.isArray(res)) {
        const total = res.reduce((sum, g) => sum + Number(g?.value || 0), 0)
        setGrid((g) => g.map((c) => (c.id === fireAt ? { ...c, state: 'hit' } : c)))
        setSelectedTargetId(null)
        setSheet({ variant: 'win', amount: Number(total.toFixed(2)), gifts: res })
        setMode('win')
        return
      }
      // Otherwise, treat as miss
      setGrid((g) => g.map((c) => (c.id === fireAt ? { ...c, state: 'miss' } : c)))
      setSelectedTargetId(null)
      setMode('enemyTurn')
      // small delay before we allow another move
      setTimeout(() => setMode('myTurn'), 1500)
    } catch (e) {
      // On error, revert to allow retry
      logger.error('BattlePage: step error', e)
      setMode('myTurn')
    }
  }

  // CTA logic
  const { ctaVisible, ctaDisabled, ctaLabel, ctaOnClick } = useMemo(() => {
    if (mode === 'selectShip' || mode === 'selectShipSelected') {
      return {
        ctaVisible: true,
        ctaDisabled: selectedShipIds.length === 0,
        ctaLabel: 'Confirm',
        ctaOnClick: onConfirm,
      }
    }
    if (mode === 'myTurn' || mode === 'myTurnSelected') {
      return {
        ctaVisible: true,
        ctaDisabled: selectedTargetId == null,
        ctaLabel: 'Fire',
        ctaOnClick: onFire,
      }
    }
    if (mode === 'myTurnFiring' || mode === 'enemyTurn' || mode === 'selectShipWaiting' || mode === 'win') {
      return { ctaVisible: false, ctaDisabled: true, ctaLabel: '', ctaOnClick: () => {} }
    }
    if (mode === 'myTurnMiss' || mode === 'myTurnHit') {
      return { ctaVisible: false, ctaDisabled: true, ctaLabel: '', ctaOnClick: () => {} }
    }
    return { ctaVisible: false, ctaDisabled: true, ctaLabel: '', ctaOnClick: () => {} }
  }, [mode, selectedShipIds.length, selectedTargetId])

  return (
    <div className="min-h-[812px] w-full max-w-[390px] mx-auto bg-black text-white relative">
      {/* Content region (no global scroll; reserve room for CTA+tabbar) */}
      <div className="absolute inset-x-0 top-0 bottom-[calc(136px+env(safe-area-inset-bottom))] overflow-y-auto px-2.5 pt-2">
  <StatusBar title={title} showTimer={TIMER_ENABLED && showTimer} secondsLeft={secondsLeft} onExit={() => navigate('/lobby')} />

        {/* 4x4 grid */}
        <div className="mt-3 grid grid-cols-4 gap-1 px-2.5 place-items-center">
          {grid.map((cell) => (
            <BattleCell
              key={cell.id}
              id={cell.id}
              state={deriveCellVisualState(cell, mode, selectedTargetId)}
              disabled={gridDisabled}
              onSelect={handleCellClick}
              showSpinner={mode === 'myTurnFiring' && selectedTargetId === cell.id}
              showBadge={badgeForCell(cell, mode)}
            />
          ))}
        </div>
      </div>

      {/* Fixed CTA */}
      {ctaVisible && (
        <div className="fixed left-0 right-0 bottom-[calc(88px+env(safe-area-inset-bottom))] px-2.5 z-40">
          <div className="mx-auto max-w-[390px] relative">
            {!ctaDisabled && (
              <div className="absolute inset-0 h-12 p-3 bg-gradient-to-b from-orange-400/75 to-amber-700/75 rounded-xl blur-[2.5px] -z-10 pointer-events-none" />
            )}
            <button
              type="button"
              disabled={ctaDisabled}
              onClick={ctaOnClick}
              className={[
                'w-full h-12 px-4 py-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
                ctaDisabled
                  ? 'bg-zinc-100/25 text-zinc-500 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.10)] cursor-not-allowed'
                  : 'bg-gradient-to-b from-orange-400 to-amber-700 shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] text-white [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] transition-transform duration-150',
              ].join(' ')}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      )}

      {/* Bottom sheet for win/lose */}
      {sheet && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => { navigate('/lobby') }} />
          <div className="fixed left-0 right-0 bottom-0 z-50">
            <div className="mx-auto max-w-[390px] bg-black rounded-t-2xl outline outline-1 outline-neutral-700 p-3 flex flex-col" style={{ height: '52vh' }}>
              <div className="flex items-center justify-between">
                <div className={[sheet.variant === 'lose' ? 'text-red-400' : 'text-white', 'text-base font-semibold'].join(' ')}>
                  {sheet.variant === 'lose' ? 'You lost' : 'Your gifts:'}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <div className={[sheet.variant === 'lose' ? 'text-red-400' : 'text-green-400', 'text-base font-semibold'].join(' ')}>
                    {sheet.variant === 'lose' ? `-${sheet.amount.toFixed(2)}` : `+${sheet.amount.toFixed(2)}`}
                  </div>
                  <img src={TonSvg} alt="TON" className="w-4 h-4 object-contain" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 flex-1 overflow-y-auto pr-1">
                {sheet.variant === 'win' && Array.isArray(sheet.gifts) && sheet.gifts.length > 0 ? (
                  sheet.gifts.map((g, i) => (
                    <div key={`${g?.gid ?? i}-${i}`} className="aspect-square rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] border border-neutral-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] grid place-items-center overflow-hidden">
                      {g?.photo ? (
                        <img src={g.photo} alt={g?.slug || 'Gift'} className="w-full h-full object-cover" />
                      ) : (
                        <img src={EmptyGiftSvg} alt="Gift" className="w-10 h-10 opacity-80" />
                      )}
                    </div>
                  ))
                ) : (
                  Array.from({ length: 6 }, (_, i) => (
                    <div key={`ph-${i}`} className="aspect-square rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] border border-neutral-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] grid place-items-center">
                      <img src={EmptyGiftSvg} alt="Gift" className="w-10 h-10 opacity-80" />
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => { navigate('/lobby') }}
                  className="w-full h-12 px-4 py-3 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] text-white font-semibold [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px]"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function deriveCellVisualState(cell, mode, selectedTargetId) {
  // prefer stored state for hits/misses
  if (cell.state === 'hit' || cell.state === 'miss') return cell.state
  if (mode === 'selectShip' || mode === 'selectShipSelected') return cell.state
  if (mode === 'myTurnSelected' && selectedTargetId === cell.id) return 'selected'
  if (mode === 'myTurn' && selectedTargetId == null) return 'idle'
  return 'idle'
}

function badgeForCell(cell, mode) {
  if (cell.state === 'miss') return { type: 'miss' }
  if (cell.state === 'hit') return { type: 'hit' }
  return null
}
