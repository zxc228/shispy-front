import React from 'react'
import TonSvg from '../../components/icons/TonIcon.svg'
import TreasureSvg from '../../components/icons/EmptyGift.svg'
import HostPlaceholder from '../../components/icons/EmptyPerson.svg'

/** @typedef {{ id:string; host:string; roomNo:string; minBet:number; ton:number; gifts:string[] }} Room */

export default function LobbyCard({ room, onJoin, isNew = false }) {
  const KeyIcon = () => (
    <span className="relative inline-block w-3.5 h-3.5 align-middle">
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-0.5 bg-white rounded" />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-white rounded" />
      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border border-white rounded-full" />
    </span>
  )

  // Resolve host avatar: if photo is null/empty/'null'/'undefined', use placeholder immediately.
  const rawPhoto = room?.photo
  const isValidPhoto = typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && rawPhoto !== 'null' && rawPhoto !== 'undefined'
  const photoSrc = isValidPhoto ? rawPhoto : HostPlaceholder

  return (
  <div className={`w-full rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-neutral-700 overflow-hidden transition-all duration-300 hover:outline-orange-400/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:-translate-y-1 cursor-pointer ${isNew ? 'animate-[pulse_1s_ease-in-out_3] outline-orange-400 shadow-[0_0_30px_rgba(251,146,60,0.5)]' : ''}`}>
      <div className="relative p-4 md:p-5 flex flex-col gap-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={photoSrc}
            alt="host"
            className="w-6 h-6 rounded-lg object-cover bg-neutral-700"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = HostPlaceholder
            }}
          />
          <span className="text-sm font-light text-white truncate inline-flex items-center gap-1">
            {room.host}
            
          </span>
          <span className="text-[10px] text-white/50">#{room.roomNo}</span>
        </div>
        <div className="absolute right-0 top-0 h-10 pl-5 pr-3 pt-2 pb-1 bg-neutral-700 rounded-l-2xl inline-flex items-center gap-1">
          <span className="text-white font-semibold">{room.ton.toFixed(2)}</span>
          <img src={TonSvg} alt="TON" className="w-4 h-4 object-contain" />
        </div>
      </div>

      {/* body */}
      <div className="flex items-center gap-3">
        {/* gifts preview (fixed width to stabilize Join button position) */}
        <div className="flex items-center gap-2 w-40 shrink-0">
          {(room.giftPhotos || []).slice(0, 2).map((src, i) => (
            <div key={i} className="w-12 h-12 rounded-[10px] border border-zinc-500 bg-neutral-900 flex items-center justify-center overflow-hidden">
              <img
                src={src || TreasureSvg}
                alt="Gift"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = TreasureSvg }}
              />
            </div>
          ))}
          {room.giftCount > 2 && (
            <div className="relative w-12 h-12 rounded-[10px] outline outline-1 outline-neutral-50 bg-neutral-900 flex items-center justify-center">
              <div className="absolute inset-0 bg-neutral-900/60 rounded-[10px]" />
              <div className="relative flex flex-col items-center justify-center leading-none">
                <div className="text-sm text-white font-medium">+{room.giftCount - 2}</div>
                <div className="text-xs text-white/50">more</div>
              </div>
            </div>
          )}
        </div>
        {/* Join button */}
        <button
          type="button"
          onClick={() => onJoin(room.id)}
          className="h-12 ml-auto w-[88px] shrink-0 mr-1 px-4 py-3 bg-gradient-to-b from-orange-400 to-amber-700 rounded-xl shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] inline-flex items-center justify-center gap-1 text-white text-base font-semibold [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px]"
        >
          Join
        </button>
      </div>
      </div>
    </div>
  )
}
