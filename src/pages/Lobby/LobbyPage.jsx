import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LobbyFilters from './LobbyFilters'
import LobbyCard from './LobbyCard'

/** @typedef {{ id:string; host:string; roomNo:string; minBet:number; ton:number; players:string[]; giftsBonus?:number }} Room */

export default function LobbyPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | '1-5' | '5-15' | '15+'
  /** @type {[Room[], Function]} */
  const [rooms, setRooms] = useState(
    /** @type {Room[]} */ (
      [
        { id: 'r-1', host: 'BlackBeard', roomNo: '00001', minBet: 1, ton: 2.1, players: ['A', 'B'] },
        { id: 'r-2', host: 'MaryRead', roomNo: '00002', minBet: 3, ton: 1.4, players: ['C', 'D'], giftsBonus: 10 },
        { id: 'r-3', host: 'CalicoJack', roomNo: '00003', minBet: 7, ton: 3.3, players: ['E', 'F'] },
        { id: 'r-4', host: 'AnneBonny', roomNo: '00004', minBet: 12, ton: 0.9, players: ['G', 'H'], giftsBonus: 5 },
        { id: 'r-5', host: 'LongJohn', roomNo: '00005', minBet: 20, ton: 5.0, players: ['I', 'J'] },
      ]
    )
  )

  // Ensure the shared <main> from AppLayout doesn't scroll; only inner content scrolls
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const prevOverflowY = main.style.overflowY
    const prevScrollbarGutter = main.style.scrollbarGutter
    main.style.overflowY = 'hidden'
    main.style.scrollbarGutter = 'auto'
    return () => {
      main.style.overflowY = prevOverflowY
      main.style.scrollbarGutter = prevScrollbarGutter
    }
  }, [])

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
      {/* Scrollable content area */}
      <div className="absolute inset-x-0 top-0 bottom-[calc(136px+env(safe-area-inset-bottom))] overflow-y-auto px-2.5 pt-2">
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

      {/* Fixed CTA above tabbar */}
      <div className="fixed left-0 right-0 bottom-[calc(80px+env(safe-area-inset-bottom))] px-2.5 z-40">
        <div className="mx-auto max-w-[390px] relative">
          <div className="absolute inset-0 h-12 p-3 bg-gradient-to-b from-white/75 to-white/75 rounded-xl blur-[2.5px] -z-10 pointer-events-none" />
          <button
            type="button"
            onClick={onCreate}
            className="h-12 w-full bg-gradient-to-l from-white to-gray-200 rounded-xl shadow-[inset_0_-1px_0_0_rgba(206,196,189,1)] text-neutral-800 font-semibold active:translate-y-[0.5px]"
          >
            Create Battle
          </button>
        </div>
      </div>
    </div>
  )
}
