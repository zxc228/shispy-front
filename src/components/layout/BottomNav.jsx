import { NavLink } from 'react-router-dom'
const tabs = [
  { to: '/map', label: 'Map' },
  { to: '/live', label: 'Live' },
  { to: '/lobby', label: 'Lobby' },
  { to: '/treasure', label: 'Treasure' },
  { to: '/profile', label: 'Profile' },
]
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 bg-black/80 backdrop-blur border-t border-white/10">
      <ul className="grid grid-cols-5 text-xs">
        {tabs.map(t => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                `flex items-center justify-center py-3 ${isActive ? 'opacity-100' : 'opacity-60'}`
              }
            >
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
