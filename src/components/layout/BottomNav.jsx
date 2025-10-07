import { NavLink } from 'react-router-dom';
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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-l from-neutral-900 to-neutral-900 border-t border-white/25 backdrop-blur-sm">
      <ul className="mx-auto max-w-[390px] w-full px-8 grid grid-cols-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0px)' }}>
        {tabs.map((t) => (
          <li key={t.to} className="h-12 inline-flex flex-col items-center justify-center">
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                [
                  'group w-10 h-12 inline-flex flex-col items-center justify-start gap-1',
                  isActive ? 'text-orange-400 active' : 'text-white/50'
                ].join(' ')
              }
            >
              <div className="flex flex-col items-center justify-start gap-1">
                <img
                  src={t.icon}
                  alt={`${t.label} icon`}
                  className="w-6 h-6 block group-[.active]:hidden"
                />
                <img
                  src={t.activatedIcon}
                  alt={`${t.label} icon active`}
                  className="w-6 h-6 hidden group-[.active]:block"
                />
                <span className="text-xs font-normal font-['SF_Pro_Display']">{t.label}</span>
              </div>
            </NavLink>
          </li>
        ))}
      </ul>
      
    </nav>
  )
}
