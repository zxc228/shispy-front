import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CreateBattleCTA from '../../components/common/CreateBattleCTA'
import OnlineCounter from '../../components/common/OnlineCounter'
import LobbyFilters from './LobbyFilters'
import LobbyCard from './LobbyCard'
import { getQueue, getWaitingStatus, cancelLobby } from '../../shared/api/lobby.api'
import EmptyPersonSvg from '../../components/icons/EmptyPerson.svg'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'
import { useGameSocket } from '../../providers/GameSocketProvider'

/** @typedef {{ id:string; host:string; roomNo:string; minBet:number; ton:number; gifts:string[] }} Room */

export default function LobbyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { withLoading } = useLoading()
  const { getSocket, connected } = useGameSocket()
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | '1-5' | '5-15' | '15+'
  /** @type {[Room[], Function]} */
  const [rooms, setRooms] = useState(/** @type {Room[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [justCreated, setJustCreated] = useState(!!location.state?.created)
  const [refreshing, setRefreshing] = useState(false)
  const [newRoomIds, setNewRoomIds] = useState(new Set()) // Track new rooms for highlight animation
  const createdSinceRef = useRef(justCreated ? Date.now() : 0)
  const navigatedRef = useRef(false)
  const touchStartY = useRef(0)
  const pullDistance = useRef(0)
  const prevRoomIdsRef = useRef(new Set())

  // Load queue from backend
  const loadQueue = async (showLoadingState = true) => {
    try {
      if (showLoadingState) setLoading(true)
      const list = await withLoading(() => getQueue())
      // Map API to Room shape
      const mapped = Array.isArray(list) ? list.map((item) => {
        const minBet = Array.isArray(item?.bet) && item.bet.length > 0
          ? Number(item.bet[0]?.value || 0)
          : 0
        const gifts = (Array.isArray(item?.bet) ? item.bet : []).map((b) => b?.slug || 'G')
        return {
          id: String(item?.queque_id ?? item?.tuid ?? Math.random()),
          host: item?.username || 'Pirate',
          roomNo: String(item?.queque_id ?? '00000').padStart(5, '0'),
          minBet,
          ton: Number(item?.value ?? 0),
          gifts,
          photo: typeof item?.photo_url === 'string' ? item.photo_url : '',
        }
      }) : []
      
      // Detect new rooms for highlight animation
      const currentIds = new Set(mapped.map(r => r.id))
      const prevIds = prevRoomIdsRef.current
      const newIds = new Set([...currentIds].filter(id => !prevIds.has(id)))
      
      setRooms(mapped)
      setNewRoomIds(newIds)
      prevRoomIdsRef.current = currentIds
      
      // Clear new room highlights after 3 seconds
      if (newIds.size > 0) {
        setTimeout(() => {
          setNewRoomIds(new Set())
        }, 3000)
      }
      
      setError('')
    } catch (e) {
      setError('Не удалось загрузить лобби')
      logger?.error?.('LobbyPage: getQueue error', e)
    } finally {
      if (showLoadingState) setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadQueue()
  }, [])

  // Polling: refresh queue every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueue(false) // Don't show loading spinner on auto-refresh
    }, 10000) // 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Socket.IO: listen for lobby updates
  useEffect(() => {
    const socket = getSocket?.()
    if (!socket || !connected) return

    const handleLobbyUpdate = () => {
      logger.info('LobbyPage: lobby_update event received')
      loadQueue(false) // Refresh without loading state
    }

    socket.on('lobby_update', handleLobbyUpdate)
    
    return () => {
      socket.off('lobby_update', handleLobbyUpdate)
    }
  }, [connected, getSocket])

  // Refresh when returning to page (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadQueue(false)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true)
    loadQueue(false)
  }

  // Poll waiting status globally on Lobby every 3 seconds
  useEffect(() => {
    let cancelled = false
    let timerId
    const check = async () => {
      try {
        const res = await getWaitingStatus()
        if (cancelled) return
        const serverWaiting = !!res?.status
        // If backend says we are in-game, navigate to battle exactly once (host case)
        if (!navigatedRef.current && res?.status === -1 && Number.isFinite(Number(res?.game_id))) {
          navigatedRef.current = true
          const gameId = Number(res.game_id)
          
          // Move pending bet to battle-specific storage
          try {
            const pending = sessionStorage.getItem('pending_bet')
            if (pending) {
              sessionStorage.setItem(`battle_bet_${gameId}`, pending)
              sessionStorage.removeItem('pending_bet')
            }
          } catch (e) {
            // ignore
          }
          
          navigate(`/lobby/battle/${gameId}`)
          return
        }
        // if we have a fresh justCreated flag (TTL 12s), keep waiting on even if server says false
        const ttlMs = 12000
        const withinTtl = justCreated && createdSinceRef.current && (Date.now() - createdSinceRef.current < ttlMs)
        const nextWaiting = serverWaiting || withinTtl
        setWaiting(nextWaiting)
        // If server acknowledges waiting, we can drop justCreated flag
        if (serverWaiting && justCreated) setJustCreated(false)
      } catch (e) {
        // keep previous waiting state on errors; continue polling
      } finally {
        if (!cancelled) timerId = setTimeout(check, 5000)
      }
    }
    check()
    return () => { cancelled = true; if (timerId) clearTimeout(timerId) }
  }, [])

  // When landing with created flag, start waiting immediately and set TTL
  useEffect(() => {
    if (location.state?.created) {
      setJustCreated(true)
      createdSinceRef.current = Date.now()
      setWaiting(true)
    }
    // We don't alter history here; state will clear on next navigation naturally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Use shared <main> scroll from AppLayout. No inner scroll container to avoid double scroll.

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case '1-5':
        return rooms.filter((r) => r.minBet >= 1 && r.minBet <= 5)
      case '5-15':
        return rooms.filter((r) => r.minBet >= 5 && r.minBet <= 15)
      case '15+':
        return rooms.filter((r) => r.minBet >= 15)
      case 'all':
      default:
        return rooms
    }
  }, [activeFilter, rooms])

  const onJoin = (roomId) => {
    navigate(`/join/${roomId}`)
  }

  const onCreate = () => {
    // переход на унифицированный экран создания
    navigate('/create')
  }

  return (
    <div className="min-h-[812px] w-full max-w-[390px] mx-auto bg-black text-white relative">
      {/* Page content (scrolls via shared <main>) */}
  <div className="px-4 pt-0 pb-[120px]">
        {/* Competition promo (temporarily disabled)
        <div className="p-3 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-neutral-700 flex justify-between items-center">
          <div className="flex flex-col">
            <div className="text-black text-lg font-extrabold">Competition!</div>
            <div className="text-neutral-900 text-xs">get pirate skins from shipsy</div>
          </div>
          <div className="relative w-20 h-12">
            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-1 h-8 bg-neutral-900/80 rounded" />
            <div className="absolute left-[55%] bottom-6 w-6 h-4 bg-white/70 rounded-sm -skew-x-6" />
            <div className="absolute left-3 right-3 bottom-0 h-3 bg-neutral-900/80 rounded-b-xl" />
            <div className="absolute left-0 right-0 -bottom-1 h-1 bg-white/30 rounded-full blur-[1px]" />
          </div>
        </div>
        */}

        {/* section title with online counter and refresh button */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-left text-white/90 text-sm tracking-wide">Lobby</div>
            {refreshing && (
              <div className="animate-spin w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 rounded-lg transition-all disabled:opacity-50"
              title="Refresh lobby"
            >
              <svg 
                className={`w-4 h-4 text-white/70 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
            <OnlineCounter />
          </div>
        </div>

        {/* filters */}
        <div className="mt-3">
          <LobbyFilters active={activeFilter} onChange={setActiveFilter} />
        </div>

        {/* waiting banner */}
        {waiting && (
          <div className="mt-3 px-3 py-2 bg-neutral-800 rounded-xl border border-neutral-700/60 text-sm text-white/80 flex items-center justify-between">
            <span>Lobby created. Waiting for opponent…</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await cancelLobby()
                  // ignore result; hide waiting immediately
                } finally {
                  setWaiting(false)
                  setJustCreated(false)
                }
              }}
              className="ml-3 h-8 px-3 bg-neutral-700 rounded-lg text-white text-xs font-semibold hover:bg-neutral-600 active:translate-y-[0.5px]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* rooms list (edge-to-edge) */}
        <div className="mt-4 grid gap-3 pb-6 -mx-4">
          {filtered.map((room) => (
            <LobbyCard 
              key={room.id} 
              room={room} 
              onJoin={onJoin} 
              isNew={newRoomIds.has(room.id)}
            />)
          )}
          {filtered.length === 0 && (
            <div className="text-center text-white/50 text-sm py-6">
              {loading ? 'Loading…' : (error || 'No rooms for this filter')}
            </div>
          )}
        </div>
      </div>
      {/* Единый CTA — прячем, если есть активное ожидание */}
      {!waiting && <CreateBattleCTA onClick={onCreate} />}
    </div>
  )
}
