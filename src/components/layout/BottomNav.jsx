import { NavLink, useLocation } from 'react-router-dom';
import MapIcon from '../icons/MapIcon.svg';
import MapIconActivated from '../icons/MapIcon_activated.svg';
import LiveIcon from '../icons/LiveIcon.svg';
import LiveIconActivated from '../icons/LiveIcon_activated.svg';
import LobbyIcon from '../icons/LobbyIcon.svg';
import LobbyIconActivated from '../icons/LobbyIcon_activated.svg';
import TreasureIcon from '../icons/TreasureIcon.svg';
import TreasureIconActivated from '../icons/TreasureIcon_activated.svg';
import ProfileIcon from '../icons/ProfileIcon.svg';
import ProfileIconActivated from '../icons/ProfileIcon_activated.svg';

const tabs = [
  { to: '/map', label: 'Maps', icon: MapIcon, activatedIcon: MapIconActivated },
  { to: '/live', label: 'Live', icon: LiveIcon, activatedIcon: LiveIconActivated },
  { to: '/lobby', label: 'Lobby', icon: LobbyIcon, activatedIcon: LobbyIconActivated },
  { to: '/treasure', label: 'Treasure', icon: TreasureIcon, activatedIcon: TreasureIconActivated },
  { to: '/profile', label: 'Profile', icon: ProfileIcon, activatedIcon: ProfileIconActivated },
];


export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-l from-neutral-900 to-neutral-900 border-t border-white/25 backdrop-blur-sm h-16 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto max-w-[390px] w-full px-4 h-full">
        <ul className="grid grid-cols-5 h-full">
        {tabs.map((t) => (
          <li key={t.to} className="h-full flex">
            <NavLink
              to={t.to}
              className={({ isActive }) => {
                const lobbyForcedActive = t.to === '/lobby' && (pathname.startsWith('/create') || pathname.startsWith('/join'));
                const active = isActive || lobbyForcedActive;
                return [
                  'group flex-1 h-full w-full flex flex-col items-center justify-center gap-1.5',
                  active ? 'text-orange-400 active' : 'text-white/50'
                ].join(' ');
              }}
            >
              <div className="flex flex-col items-center justify-center gap-1.5 h-full w-full">
                <img
                  src={t.icon}
                  alt={`${t.label} icon`}
                  className="w-8 h-8 block group-[.active]:hidden"
                />
                <img
                  src={t.activatedIcon}
                  alt={`${t.label} icon active`}
                  className="w-8 h-8 hidden group-[.active]:block"
                />
                <span className="text-sm leading-none font-medium font-sans">{t.label}</span>
              </div>
            </NavLink>
          </li>
        ))}
        </ul>
      </div>
    </nav>
  )
}
