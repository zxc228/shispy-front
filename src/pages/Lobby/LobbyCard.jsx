import React from 'react'

/** @typedef {{ id:string; host:string; roomNo:string; minBet:number; ton:number; players:string[]; giftsBonus?:number }} Room */

export default function LobbyCard({ room, onJoin }) {
  const TonIcon = () => (
    <span className="relative inline-flex items-center justify-center w-4 h-4">
      <span className="absolute w-3 h-3 bg-sky-500" />
      <span className="absolute w-2 h-2 bg-white" />
    </span>
  )

  return (
    <div className="pl-3 pb-3 rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-neutral-700 flex flex-col gap-8 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between pr-3 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${room.host}`} alt="host" className="w-6 h-6 rounded-lg object-cover bg-neutral-700" />
          <span className="text-sm font-light text-white truncate">{room.host}</span>
          <span className="w-3 h-3 bg-white" />
          <span className="text-[10px] text-white/50">#{room.roomNo}</span>
        </div>
        <div className="h-10 pl-5 pr-2 pt-2 pb-1 bg-neutral-700 rounded-bl-3xl inline-flex items-center gap-1">
          <span className="text-white font-semibold">{room.ton.toFixed(2)}</span>
          <TonIcon />
        </div>
      </div>

      {/* body */}
      <div className="flex items-center gap-3 pr-3">
        {/* players preview (fixed width to stabilize Join button position) */}
        <div className="flex items-center gap-2 w-40 shrink-0">
          {room.players.slice(0, 2).map((p, i) => (
            <div key={i} className="w-12 h-12 rounded-[10px] border border-zinc-500 bg-neutral-900 flex items-center justify-center text-white/50">
              {p}
            </div>
          ))}
          {room.giftsBonus != null && (
            <div className="relative w-12 h-12 rounded-[10px] outline outline-1 outline-neutral-50 bg-neutral-900 flex items-center justify-center">
              <div className="absolute inset-0 bg-neutral-900/60 rounded-[10px]" />
              <div className="relative flex flex-col items-center justify-center leading-none">
                <div className="text-sm text-white font-medium">+{room.giftsBonus}</div>
                <div className="text-xs text-white/50">TgGift</div>
              </div>
            </div>
          )}
        </div>
        {/* Join button */}
        <button
          type="button"
          onClick={() => onJoin(room.id)}
          className="h-12 ml-auto w-44 shrink-0 px-4 py-3 bg-gradient-to-b from-orange-400 to-amber-700 rounded-xl shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] inline-flex items-center justify-center gap-1 text-white text-base font-semibold [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px]"
        >
          Join
        </button>
      </div>
    </div>
  )
}
