import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateBattleCTA from '../../components/common/CreateBattleCTA'
import LobbyFilters from './LobbyFilters'
import LobbyCard from './LobbyCard'

/** @typedef {{ id:string; host:string; roomNo:string; minBet:number; ton:number; gifts:string[] }} Room */

export default function LobbyPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | '1-5' | '5-15' | '15+'
  /** @type {[Room[], Function]} */
  const [rooms, setRooms] = useState(
    /** @type {Room[]} */ (
      [
        { id: 'r-1', host: 'BlackBeard', roomNo: '00001', minBet: 1, ton: 2.1, gifts: ['G1', 'G2'] },
        { id: 'r-2', host: 'MaryRead', roomNo: '00002', minBet: 3, ton: 1.4, gifts: ['G1', 'G2', 'G3', 'G4'] },
        { id: 'r-3', host: 'CalicoJack', roomNo: '00003', minBet: 7, ton: 3.3, gifts: ['G1'] },
        { id: 'r-4', host: 'AnneBonny', roomNo: '00004', minBet: 12, ton: 0.9, gifts: ['G1', 'G2', 'G3'], },
        { id: 'r-5', host: 'LongJohn', roomNo: '00005', minBet: 20, ton: 5.0, gifts: ['G1', 'G2', 'G3', 'G4', 'G5'] },
      ]
    )
  )

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
  <div className="px-4 pt-2 pb-[120px]">
        {/* promo card */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-neutral-700 flex justify-between items-center">
          <div className="flex flex-col">
            <div className="text-black text-lg font-extrabold">Competition!</div>
            <div className="text-neutral-900 text-xs">get pirate skins from shipsy</div>
          </div>
          {/* decorative ship made of divs */}
          <div className="relative w-20 h-12">
            {/* mast */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-1 h-8 bg-neutral-900/80 rounded" />
            {/* sail */}
            <div className="absolute left-[55%] bottom-6 w-6 h-4 bg-white/70 rounded-sm -skew-x-6" />
            {/* hull */}
            <div className="absolute left-3 right-3 bottom-0 h-3 bg-neutral-900/80 rounded-b-xl" />
            {/* waves */}
            <div className="absolute left-0 right-0 -bottom-1 h-1 bg-white/30 rounded-full blur-[1px]" />
          </div>
        </div>

        {/* section title */}
        <div className="mt-4 text-center text-white/90 text-sm tracking-wide">Lobby</div>

        {/* filters */}
        <div className="mt-3">
          <LobbyFilters active={activeFilter} onChange={setActiveFilter} />
        </div>

        {/* rooms list */}
        <div className="mt-4 grid gap-3 pb-6">
          {filtered.map((room) => (
            <LobbyCard key={room.id} room={room} onJoin={onJoin} />)
          )}
          {filtered.length === 0 && (
            <div className="text-center text-white/50 text-sm py-6">No rooms for this filter</div>
          )}
        </div>
      </div>
      {/* Единый CTA */}
      <CreateBattleCTA onClick={onCreate} />
    </div>
  )
}
