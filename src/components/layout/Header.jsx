import { useNavigate } from 'react-router-dom'
import ShipsyIcon from '../icons/ShipsyIcon.svg'

export default function Header({
  hidden = false,
  logoSrc,
}) {
  const nav = useNavigate()
  const logoUrl = logoSrc ?? ShipsyIcon
  // i18n temporarily disabled

  return (
    <header
      className={[
        'sticky top-0 z-20 bg-black/80 backdrop-blur transition-transform duration-300',
        hidden ? '-translate-y-full' : 'translate-y-0'
      ].join(' ')}
      aria-label="App header"
    >
  <div className="px-4 py-2 rounded-t-2xl max-w-[390px] w-full mx-auto">
        <div className="flex items-center justify-between">
          {/* LEFT: logo + caption */}
          <div className="h-11 flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="Shipsy logo"
                className="w-8 h-8 object-contain cursor-pointer"
                onClick={() => nav('/')}
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-white text-base font-semibold font-sans leading-none">
                Shipsy
              </div>
              <div className="text-white/50 text-[10px] leading-none font-sans">
                For fights For player
              </div>
            </div>
          </div>
          {/* RIGHT: language toggle temporarily hidden */}
          <div className="flex items-center h-11" />
        </div>
      </div>
    </header>
  )
}
