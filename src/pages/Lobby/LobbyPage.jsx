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
        const betArr = Array.isArray(item?.bet) ? item.bet : []
        
        // Decode hex-encoded string to base64 (handles backend's \x89PNG format)
        const hexToBase64 = (hexStr) => {
          try {
            let cleaned = hexStr
            
            // If it starts with XHg (which is base64 of "\x89P..."), decode base64 first
            if (cleaned.startsWith('XHg')) {
              const decoded = atob(cleaned)
              // decoded выглядит как "\\x89" + затем последовательность HEX символов, например "504E0D0A1A0A..."
              let bytes = []
              // 1) вытащим все \\xNN байты
              let rest = decoded.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hh) => {
                bytes.push(parseInt(hh, 16))
                return ''
              })
              // 2) оставшаяся строка — это сплошной HEX, распарсим его попарно
              rest = (rest || '').replace(/[^0-9A-Fa-f]/g, '')
              for (let i = 0; i + 1 < rest.length; i += 2) {
                const hx = rest.substr(i, 2)
                if (/^[0-9A-Fa-f]{2}$/.test(hx)) {
                  bytes.push(parseInt(hx, 16))
                }
              }
              if (bytes.length === 0) return null
              let binary = ''
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
              return btoa(binary)
            }
            
            // Handle \x prefixed hex strings (e.g., "\x89PNG...")
            if (cleaned.startsWith('\\x')) {
              cleaned = cleaned.replace(/\\x/g, '')
              const bytes = []
              for (let i = 0; i < cleaned.length; i += 2) {
                const hex = cleaned.substr(i, 2)
                if (hex.length === 2 && /^[0-9a-fA-F]{2}$/.test(hex)) {
                  bytes.push(parseInt(hex, 16))
                }
              }
              let binary = ''
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i])
              }
              return btoa(binary)
            }
            
            return null
          } catch (e) {
            logger.warn('LobbyPage: failed to decode hex photo', e)
            return null
          }
        }

        // normalize possible gift photo sources and base64
        const normalizePhoto = (rawCandidate) => {
          if (!rawCandidate) return ''
          if (typeof rawCandidate !== 'string') return ''
          const raw = rawCandidate
          if (!raw || raw === 'null' || raw === 'undefined') return ''
          if (raw.startsWith('http') || raw.startsWith('data:')) return raw
          // Heuristic: if it's a UUID gid, not an image
          if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(raw)) return ''
          // Heuristic: short strings likely not base64
          if (raw.length < 64) return ''
          
          // Check if it's hex-encoded binary (starts with \x or XHg or looks like hex pairs)
          if (raw.startsWith('\\x') || raw.startsWith('XHg')) {
            const base64 = hexToBase64(raw)
            if (base64) {
              return `data:image/png;base64,${base64}`
            }
            return ''
          }
          
          // Basic base64 chars check (non-strict)
          if (!/^[A-Za-z0-9+/=]+$/.test(raw)) return ''
          return `data:image/png;base64,${raw}`
        }

        // deep search for an image-like string inside unknown object shapes
        const extractImageDeep = (obj, depth = 2) => {
          if (!obj || typeof obj !== 'object' || depth < 0) return ''
          // Prefer obvious keys first
          const direct = ['photo', 'photo_url', 'image', 'img', 'base64', 'photo_base64', 'thumbnail', 'thumb']
            .map((k) => obj?.[k])
            .find((v) => typeof v === 'string' && normalizePhoto(v))
          if (typeof direct === 'string' && normalizePhoto(direct)) return normalizePhoto(direct)
          // Then scan nested objects/arrays
          for (const k of Object.keys(obj)) {
            const v = obj[k]
            if (typeof v === 'string') {
              const n = normalizePhoto(v)
              if (n) return n
            } else if (v && typeof v === 'object') {
              const n = extractImageDeep(v, depth - 1)
              if (n) return n
            }
          }
          return ''
        }

        const minBet = betArr.length > 0 ? Number((betArr[0]?.value ?? betArr[0]?.price ?? 0)) : 0
        const giftCount = betArr.length
        const giftPhotos = betArr.slice(0, 3).map((b, idx) => {
          if (!b) return ''
          if (typeof b === 'string') {
            const result = normalizePhoto(b)
            logger.debug(`LobbyPage: gift ${idx} string conversion`, { hasResult: !!result, sample: b.slice(0, 50) })
            return result
          }
          if (typeof b === 'object') {
            // try common keys then deep
            const photoField = b.photo || b.photo_url || b.image || b.img || b.base64 || b.photo_base64 || b.thumbnail || b.thumb
            logger.debug(`LobbyPage: gift ${idx} object`, { 
              hasPhotoField: !!photoField, 
              photoSample: photoField ? String(photoField).slice(0, 50) : 'none' 
            })
            const direct = normalizePhoto(photoField)
            const result = direct || extractImageDeep(b)
            logger.debug(`LobbyPage: gift ${idx} final result`, { hasResult: !!result, resultSample: result ? result.slice(0, 80) : 'none' })
            return result
          }
          return ''
        })

        return {
          id: String(item?.queque_id ?? item?.tuid ?? Math.random()),
          host: item?.username || 'Pirate',
          roomNo: String(item?.queque_id ?? '00000').padStart(5, '0'),
          minBet,
          ton: Number(item?.value ?? 0),
          giftCount,
          giftPhotos,
          photo: normalizePhoto(item?.photo_url) || '',
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
        // If server indicates we are in queue (searching), redirect to WaitingScreen immediately
        if (serverWaiting && res?.status !== -1) {
          navigate('/lobby/waiting', { replace: true })
          return
        }
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
        // Ensure search timestamp exists while waiting
        try {
          if (serverWaiting && !sessionStorage.getItem('search_started_at')) {
            sessionStorage.setItem('search_started_at', String(Date.now()))
          }
        } catch {}

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

  // If local waiting flag is set (e.g., just created), redirect to waiting screen
  useEffect(() => {
    if (waiting) {
      navigate('/lobby/waiting', { replace: true })
    }
  }, [waiting, navigate])

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
