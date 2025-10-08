import React from 'react'

export default function LobbyFilters({ active, onChange }) {
  const Chip = ({ value, children, active }) => {
    const base = 'h-8 px-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1 select-none leading-none'
    if (active) {
      return (
        <button onClick={() => onChange(value)} className={`${base} bg-neutral-700 text-white`}>
          {children}
        </button>
      )
    }
    return (
      <button onClick={() => onChange(value)} className={`${base} bg-black outline outline-1 outline-neutral-700 text-white`}>
        {children}
      </button>
    )
  }

  const TonIcon = () => (
    <span className="relative inline-flex items-center justify-center w-3 h-3 align-middle">
      <span className="absolute w-2.5 h-2.5 bg-sky-500" />
      <span className="absolute w-1.5 h-1.5 bg-white" />
    </span>
  )

  return (
    <div className="flex flex-wrap gap-1">
      <Chip value="all" active={active === 'all'}>
        All
      </Chip>
      <Chip value="1-5" active={active === '1-5'}>
        <TonIcon />
        <span className="leading-none">1-5</span>
      </Chip>
      <Chip value="5-15" active={active === '5-15'}>
        <TonIcon />
        <span className="leading-none">5-15</span>
      </Chip>
      <Chip value="15+" active={active === '15+'}>
        <TonIcon />
        <span className="leading-none">15+</span>
      </Chip>
      {/* private battles key icon */}
      <button
        className="w-8 h-8 bg-black rounded-xl outline outline-1 outline-neutral-700 inline-flex items-center justify-center"
        onClick={() => onChange('all')}
        title="Private battles"
        aria-label="Private battles"
      >
        {/* simple key placeholder */}
        <span className="relative w-2.5 h-2.5">
          <span className="absolute inset-0 bg-white" />
        </span>
      </button>
    </div>
  )
}
