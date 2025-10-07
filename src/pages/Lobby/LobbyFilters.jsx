import React from 'react'

export default function LobbyFilters({ active, onChange }) {
  const Chip = ({ value, children, active }) => {
    const base = 'h-10 px-3 rounded-xl font-bold inline-flex items-center gap-1 select-none'
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
    <span className="relative inline-flex items-center justify-center w-4 h-4">
      <span className="absolute w-3 h-3 bg-sky-500" />
      <span className="absolute w-2 h-2 bg-white" />
    </span>
  )

  return (
    <div className="flex gap-1.5">
      <Chip value="all" active={active === 'all'}>
        All
      </Chip>
      <Chip value="1-5" active={active === '1-5'}>
        <TonIcon /> 1-5
      </Chip>
      <Chip value="5-15" active={active === '5-15'}>
        <TonIcon /> 5-15
      </Chip>
      <Chip value="15+" active={active === '15+'}>
        <TonIcon /> 15+
      </Chip>
      {/* private battles key icon */}
      <button
        className="w-10 h-10 bg-black rounded-xl outline outline-1 outline-neutral-700 inline-flex items-center justify-center"
        onClick={() => onChange('all')}
        title="Private battles"
        aria-label="Private battles"
      >
        {/* simple key placeholder */}
        <span className="relative w-3 h-3">
          <span className="absolute inset-0 bg-white" />
        </span>
      </button>
    </div>
  )
}
