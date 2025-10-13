import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateBattleCTA from '../../components/common/CreateBattleCTA'
import LobbyFilters from './LobbyFilters'
import LobbyCard from './LobbyCard'
import { getQueue } from '../../shared/api/lobby.api'
import EmptyPersonSvg from '../../components/icons/EmptyPerson.svg'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'

/** @typedef {{ id:string; host:string; roomNo:string; minBet:number; ton:number; gifts:string[] }} Room */

export default function LobbyPage() {
  const navigate = useNavigate()
  const { withLoading } = useLoading()
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | '1-5' | '5-15' | '15+'
  /** @type {[Room[], Function]} */
  const [rooms, setRooms] = useState(/** @type {Room[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load queue from backend
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        const list = await withLoading(() => getQueue())
        if (cancelled) return
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
        setRooms(mapped)
      } catch (e) {
        if (cancelled) return
        setError('Не удалось загрузить лобби')
        logger?.error?.('LobbyPage: getQueue error', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
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

        {/* section title */}
  <div className="mt-2 text-left text-white/90 text-sm tracking-wide">Lobby</div>

        {/* filters */}
        <div className="mt-3">
          <LobbyFilters active={activeFilter} onChange={setActiveFilter} />
        </div>

        {/* rooms list (edge-to-edge) */}
        <div className="mt-4 grid gap-3 pb-6 -mx-4">
          {filtered.map((room) => (
            <LobbyCard key={room.id} room={room} onJoin={onJoin} />)
          )}
          {filtered.length === 0 && (
            <div className="text-center text-white/50 text-sm py-6">
              {loading ? 'Loading…' : (error || 'No rooms for this filter')}
            </div>
          )}
        </div>
      </div>
      {/* Единый CTA */}
      <CreateBattleCTA onClick={onCreate} />
    </div>
  )
}
