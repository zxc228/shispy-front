import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatusBar from './StatusBar'
import TonSvg from '../../components/icons/TonIcon.svg'
import EmptyGiftSvg from '../../components/icons/EmptyGift.svg'
import BattleCell from './BattleCell'
import Confetti from '../../components/animations/Confetti'
// REST battle APIs removed from this component in realtime mode
import { logger } from '../../shared/logger'
import { useTelegram } from '../../providers/TelegramProvider'
import useBattleSocket from '../../hooks/useBattleSocket'

/** @typedef {"idle"|"selected"|"hit"|"miss"|"disabled"} CellState */
/** @typedef {"selectShip"|"selectShipSelected"|"selectShipWaiting"|"myTurn"|"myTurnSelected"|"myTurnFiring"|"myTurnMiss"|"enemyTurn"|"myTurnHit"|"win"} BattleMode */

export default function BattlePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // In realtime mode, timer comes from server
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [mode, setMode] = useState(/** @type {BattleMode} */('selectShip'))
  const [grid, setGrid] = useState(() => Array.from({ length: 16 }, (_, i) => ({ id: i, state: /** @type {CellState} */('idle') })))
  const [selectedShipIds, setSelectedShipIds] = useState(/** @type {number[]} */([]))
  const [selectedTargetId, setSelectedTargetId] = useState(/** @type {number|null} */(null))
  const [attackingCell, setAttackingCell] = useState(/** @type {number|null} */(null)) // Cell being attacked
  const [sheet, setSheet] = useState(/** @type {null|{variant:'win'|'lose', amount:number, gifts?: any[]}} */(null))
  const [showConfetti, setShowConfetti] = useState(false)
  const [firstWinTriggered, setFirstWinTriggered] = useState(false)
  const pollingRef = useRef(/** @type {any} */(null))
  const gameId = useMemo(() => Number(id), [id])
  const [secondsLeft, setSecondsLeft] = useState(25)
  const { user } = useTelegram?.() || { user: null }
  const battle = useBattleSocket(gameId)
  const [placedSecret, setPlacedSecret] = useState(false)
  const [tossInfo, setTossInfo] = useState(null)
  const [tossShown, setTossShown] = useState(false) // Track if toss was already shown
  const [myBet, setMyBet] = useState(null) // Store player's bet for showing on loss

  // Normalize gift photos: ensure http/data prefix for base64 payloads
  const normalizeGifts = (arr) => {
    if (!Array.isArray(arr)) return []
    return arr.map((g) => {
      const raw = g?.photo || ''
      const photo = typeof raw === 'string' && raw.length > 0
        ? (raw.startsWith('http') || raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`)
        : ''
      return { ...g, photo }
    })
  }

  // Load player's bet from sessionStorage (saved during create/join)
  useEffect(() => {
    try {
      const betKey = `battle_bet_${gameId}`
      const stored = sessionStorage.getItem(betKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setMyBet(parsed) // { gifts: [...], total: number }
      }
    } catch (e) {
      logger.warn('BattlePage: failed to load bet from storage', e)
    }
  }, [gameId])

  // derived title and CTA
  const { title, showTimer } = useMemo(() => {
    // In placing phase, show helpful hint if timer hasn't started yet
    const placingTitle = battle.placingTimerStarted 
      ? 'Select a cell' 
      : 'Select a cell to hide your NFT'
    
    switch (mode) {
      case 'selectShip':
      case 'selectShipSelected':
        // Show timer only if placing timer has started (someone already picked)
        return { title: placingTitle, showTimer: battle.placingTimerStarted ?? false }
      case 'selectShipWaiting':
        return { title: battle.placingTimerStarted ? 'Waiting for opponent' : 'Waiting for opponent to choose', showTimer: battle.placingTimerStarted ?? false }
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
  }, [mode, battle.placingTimerStarted])

  // disable interactions in these modes
  const gridDisabled = ['selectShipWaiting', 'myTurnFiring', 'enemyTurn', 'win'].includes(mode)

  // Disable legacy polling entirely in realtime migration
  useEffect(() => { return () => {} }, [])

  // Turn timer (fallback only): run countdown on relevant modes when not realtime
  useEffect(() => {
    if (battle.useRealtime) return
    const TIMER_ENABLED = false
    if (!TIMER_ENABLED) return
    const timedModes = new Set(['myTurn', 'myTurnSelected', 'myTurnFiring', 'enemyTurn'])
    if (!timedModes.has(mode)) return
    setSecondsLeft(25)
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [mode])

  // Realtime mapping: phase/turn -> UI mode and timer seconds
  useEffect(() => {
    if (!battle.useRealtime) return
    // enable server timer
    setTimerEnabled(true)
    
    logger.info('BattlePage: realtime state changed', { 
      phase: battle.phase, 
      role: battle.role, 
      turn: battle.turn,
      currentMode: mode 
    })
    
    // coin toss overlay - show only once per game
    if (battle.toss && !tossShown) {
      setTossInfo(battle.toss)
      setTossShown(true)
      setTimeout(() => setTossInfo(null), 2500) // longer duration for animation
    }
    
    // Update timer based on phase
    if (battle.phase === 'placing') {
      // Use placing timer
      setSecondsLeft(Math.ceil((battle.placingTimeLeft || 0) / 1000))
    } else {
      // Use player's turn timer
      if (battle.role === 'a') setSecondsLeft(Math.ceil((battle.timeLeft.a || 0) / 1000))
      if (battle.role === 'b') setSecondsLeft(Math.ceil((battle.timeLeft.b || 0) / 1000))
    }

    // phase mapping
    if (battle.phase === 'waiting_players') {
      // Waiting for second player to join
      logger.info('BattlePage: waiting for second player')
      setMode('selectShipWaiting')
      return
    }
    if (battle.phase === 'placing') {
      logger.info('BattlePage: setting mode for placing phase', { placedSecret })
      setMode(placedSecret ? 'selectShipWaiting' : 'selectShip')
      return
    }
    if (battle.phase === 'toss') {
      // freeze interactions briefly
      logger.info('BattlePage: toss phase, freezing UI')
      setMode('enemyTurn')
      return
    }
    if (battle.phase === 'turn_a' || battle.phase === 'turn_b') {
      const myTurn = battle.role && battle.turn && (battle.role === battle.turn)
      logger.info('BattlePage: turn phase', { myTurn, role: battle.role, turn: battle.turn })
      setMode((prev) => {
        if (myTurn) {
          const newMode = prev === 'myTurnSelected' ? 'myTurnSelected' : 'myTurn'
          logger.info('BattlePage: my turn, setting mode', { prev, newMode })
          return newMode
        }
        logger.info('BattlePage: enemy turn, setting enemyTurn mode')
        return 'enemyTurn'
      })
      return
    }
    if (battle.phase === 'finished') {
      // gameOver handled below
      logger.info('BattlePage: game finished')
      return
    }
  }, [battle.useRealtime, battle.phase, battle.role, battle.turn, battle.timeLeft, battle.placingTimeLeft, battle.placingTimerStarted, battle.toss, placedSecret, tossShown, mode])

  // Apply move results to grid and finish state in realtime
  useEffect(() => {
    if (!battle.useRealtime) return
    if (!battle.lastMove) return
    const mr = battle.lastMove
    const isMine = mr.by === battle.role
    // Mark only my own fired cell on my target grid
    if (isMine && typeof mr.cell === 'number') {
      setGrid((g) => g.map((c) => (c.id === mr.cell ? { ...c, state: mr.result === 'hit' ? 'hit' : 'miss' } : c)))
      setAttackingCell(null) // Clear attacking animation
    }
    setSelectedTargetId(null)
    if (mr.result === 'hit' && mr.winner) {
      // finish will also trigger game_over; set mode to win if I'm winner
      if (mr.winner === battle.role) {
        // Parse rewards from move_result
        const rewards = normalizeGifts(mr.rewards || [])
        const total = rewards.reduce((sum, g) => sum + Number(g?.value || 0), 0)
        setSheet({ variant: 'win', amount: Number(total.toFixed(2)), gifts: rewards })
        setShowConfetti(true) // Show confetti on win!
        setMode('win')
      }
    }
  }, [battle.useRealtime, battle.lastMove, battle.role])

  // Recover UI on server errors (e.g., step failed)
  useEffect(() => {
    if (!battle.useRealtime) return
    if (!battle.lastError) return
    // Reset firing state back to myTurn so user can retry
    setMode('myTurn')
  }, [battle.useRealtime, battle.lastError])

  // Show win/lose sheet when server ends the game
  useEffect(() => {
    if (!battle.useRealtime) return
    if (!battle.gameOver) return
    const win = battle.gameOver.winner === battle.role
    
    if (win) {
      // Winner: show rewards from server
      const rewards = normalizeGifts(battle.gameOver.rewards || [])
      const total = rewards.reduce((sum, g) => sum + Number(g?.value || 0), 0)
      setSheet({ 
        variant: 'win', 
        amount: Number(total.toFixed(2)),
        gifts: rewards
      })
      setShowConfetti(true) // Show confetti on win!
      setMode('win')
    } else {
      // Loser: show what was bet and lost
      const lostGifts = myBet?.gifts || []
      const lostTotal = myBet?.total || 0
      setSheet({
        variant: 'lose',
        amount: Number(lostTotal.toFixed(2)),
        gifts: lostGifts
      })
      setMode('win') // Use same mode to allow clicking through overlay
    }
  }, [battle.useRealtime, battle.gameOver, battle.role, myBet])

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
      // Always use realtime socket; server also persists to backend
      setPlacedSecret(true)
      const treasureCell = selectedShipIds[0]
      logger.info('BattlePage: placing secret', { treasureCell, gameId })
      battle.placeSecret(treasureCell)
      setMode('selectShipWaiting')
      logger.info('BattlePage: secret placed, waiting for opponent')
    } catch (e) {
      // fallback to allow playing; keep going
      logger.error('BattlePage: setTreasureField error', e)
    }
  }

  const onFire = async () => {
    if (selectedTargetId == null || !Number.isFinite(gameId)) return
    const fireAt = selectedTargetId
    setAttackingCell(fireAt) // Show attacking animation
    setMode('myTurnFiring')
    try {
      // Always use realtime socket; server validates and switches turn
      const moveId = `${Date.now()}-${fireAt}`
      battle.move(fireAt, moveId)
    } catch (e) {
      // On error, revert to allow retry
      logger.error('BattlePage: step error', e)
      setMode('myTurn')
      setAttackingCell(null)
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

  // Calculate max time for progress bar based on current phase
  const maxTime = useMemo(() => {
    if (battle.useRealtime && battle.phase === 'placing') {
      return 20 // 20 seconds for placing phase
    }
    return 25 // 25 seconds for turn phases
  }, [battle.useRealtime, battle.phase])

  return (
    <div className="min-h-[812px] w-full max-w-[390px] mx-auto bg-black text-white relative">
      {/* Confetti on win */}
      {showConfetti && <Confetti duration={4000} particleCount={80} />}
      
      {/* Content region (no global scroll; reserve room for CTA+tabbar) */}
      <div className="absolute inset-x-0 top-0 bottom-[calc(136px+env(safe-area-inset-bottom))] overflow-y-auto px-2.5 pt-2">
        <StatusBar title={title} showTimer={timerEnabled && showTimer} secondsLeft={secondsLeft} maxTime={maxTime} />

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
              isAttacking={attackingCell === cell.id}
            />
          ))}
        </div>
      </div>

      {/* Coin toss overlay */}
      {tossInfo && (
        <div className="fixed inset-0 z-50 grid place-items-center pointer-events-none bg-black/40">
          <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.3s_ease-out]">
            {/* Spinning coin */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_40px_rgba(251,191,36,0.6)] animate-[spin_1s_ease-in-out] flex items-center justify-center text-4xl">
              🪙
            </div>
            {/* Result text */}
            <div className="px-6 py-3 rounded-2xl bg-neutral-900/95 border-2 border-amber-400/50 text-white text-lg font-bold shadow-lg animate-[slideUp_0.4s_ease-out_0.8s_both]">
              {battle.role && tossInfo.firstTurn === battle.role ? '🎯 You start!' : '⏳ Opponent starts'}
            </div>
          </div>
        </div>
      )}

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
                {Array.isArray(sheet.gifts) && sheet.gifts.length > 0 ? (
                  // Show actual gifts (either won or lost)
                  sheet.gifts.map((g, i) => (
                    <div 
                      key={`gift-${g?.gid ?? i}-${i}`} 
                      className={[
                        "aspect-square rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] border border-neutral-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] grid place-items-center overflow-hidden",
                        sheet.variant === 'win' ? 'animate-[giftDrop_0.6s_ease-out_forwards]' : ''
                      ].join(' ')}
                      style={sheet.variant === 'win' ? { animationDelay: `${i * 0.1}s` } : {}}
                    >
                      {g?.photo ? (
                        <img src={g.photo} alt={g?.slug || 'Gift'} className="w-full h-full object-cover" />
                      ) : (
                        <img src={EmptyGiftSvg} alt="Gift" className="w-10 h-10 opacity-80" />
                      )}
                    </div>
                  ))
                ) : (
                  // Show empty placeholders if no gifts data
                  Array.from({ length: 6 }, (_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] border border-neutral-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] grid place-items-center">
                      <img src={EmptyGiftSvg} alt="Empty" className="w-10 h-10 opacity-40" />
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
