import { useNavigate } from 'react-router-dom'
import { useBalance } from '../../providers/BalanceProvider'
import TonIcon from '../icons/TonIcon.svg'
import ShipsyIcon from '../icons/ShipsyIcon.svg'

export default function Header({
  hidden = false,
  balance = undefined,
  logoSrc,
  onAdd,
}) {
  const nav = useNavigate()
  const { amount } = useBalance()
  const handleAdd = () => (onAdd ? onAdd() : nav('/add'))
  const logoUrl = logoSrc ?? ShipsyIcon

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
          <div className="h-11 flex items-center gap-2">
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

          {/* RIGHT: balance + Add */}
          <div className="relative w-40 h-11 rounded-xl bg-[radial-gradient(ellipse_79.53%_695.78%_at_3.18%_7.95%,_#111111_0%,_#222222_100%)]">
            {/* баланс слева */}
            <div className="absolute left-[-1px] top-0 h-11 pl-3 pr-4 py-3 rounded-xl inline-flex items-center">
              <div className="inline-flex items-center gap-1">
                <img src={TonIcon} alt="TON" className="w-4 h-4 shrink-0 object-contain" />
                <span className="text-white text-base font-bold font-sans">
                  {balance ?? amount}
                </span>
              </div>
            </div>

            {/* подсветка под Add */}
            <div className="absolute left-[85px] -top-0.5 w-20 h-12 p-3 bg-gradient-to-b from-orange-400/75 to-amber-700/75 rounded-xl blur-[2.5px]" />

            {/* кнопка Add — плюс без иконок */}
            <button
              onClick={handleAdd}
              className="absolute left-[80px] -top-0.5 h-12 pl-3 pr-4 py-3 bg-gradient-to-b from-orange-400 to-amber-700 rounded-xl shadow-[inset_0_-1px_0_rgba(230,141,74,1)] inline-flex items-center gap-1.5 active:translate-y-[0.5px]"
              aria-label="Add TON"
            >
              {/* контейнер 24×24 с крестом, как в макете */}
              <span className="relative w-6 h-6 shrink-0 drop-shadow-[0_1px_25px_rgba(0,0,0,0.25)]">
                {/* горизонтальная черта */}
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-0.5 bg-white rounded" />
                {/* вертикальная черта */}
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-white rounded" />
              </span>
              <span className="text-white text-base font-semibold leading-none font-sans [text-shadow:_0_1px_25px_rgb(0_0_0_/_0.25)]">
                Add
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
