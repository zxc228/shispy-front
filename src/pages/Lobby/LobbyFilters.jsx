import React from 'react'
import DollarIcon from '../../components/icons/DollarIcon.svg'

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

  const DollarIconComponent = () => (
    <img src={DollarIcon} alt="USD" className="w-3.5 h-3.5 object-contain" />
  )

  return (
    <div className="flex flex-wrap gap-1">
      <Chip value="all" active={active === 'all'}>
        All
      </Chip>
      <Chip value="1-5" active={active === '1-5'}>
        <DollarIconComponent />
        <span className="leading-none">1-5</span>
      </Chip>
      <Chip value="5-15" active={active === '5-15'}>
        <DollarIconComponent />
        <span className="leading-none">5-15</span>
      </Chip>
      <Chip value="15+" active={active === '15+'}>
        <DollarIconComponent />
        <span className="leading-none">15+</span>
      </Chip>
    </div>
  )
}
