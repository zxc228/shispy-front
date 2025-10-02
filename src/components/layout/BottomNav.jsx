import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/map', label: 'Maps' },
  { to: '/live', label: 'Live' },
  { to: '/lobby', label: 'Lobby' },
  { to: '/treasure', label: 'Treasure' },
  { to: '/profile', label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-l from-neutral-900 to-neutral-900 border-t border-white/25 backdrop-blur-sm">
      <ul className="mx-auto max-w-[390px] px-8 grid grid-cols-5">
        {tabs.map((t) => (
          <li key={t.to} className="h-12 inline-flex flex-col items-center justify-center">
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                [
                  'w-10 h-12 inline-flex flex-col items-center justify-start gap-1',
                  isActive ? 'text-orange-400' : 'text-white/50'
                ].join(' ')
              }
            >
              {/* TODO: заменить на реальные SVG иконки из фигмы */}
              <span className="w-6 h-6 relative">
                <span className="w-5 h-4 left-[2px] top-[6px] absolute bg-neutral-50/80 rounded-sm" />
              </span>
              <span className="text-xs font-normal font-['SF_Pro_Display']">{t.label}</span>
              {/* активный градиентный подчёрк */}
              {({ isActive }) =>
                isActive ? (
                  <span className="w-9 h-0 relative mt-[2px]">
                    <span className="w-9 h-0 left-0 top-0 absolute bg-gradient-to-b from-orange-400 to-amber-700 outline outline-1 outline-offset-[-0.5px] outline-orange-400 blur-[2.5px]" />
                    <span className="w-9 h-0 left-0 top-0 absolute outline outline-1 outline-offset-[-0.5px] outline-orange-400" />
                  </span>
                ) : (
                  <span className="w-9 h-0" />
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
      
    </nav>
  )
}
