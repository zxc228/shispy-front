import { useNavigate } from 'react-router-dom'

export default function CreateBattleCTA({ onClick, disabled = false }) {
  const navigate = useNavigate()
  const handleClick = () => (onClick ? onClick() : navigate('/create'))

  return (
    <div className="fixed left-0 right-0 bottom-[calc(88px+env(safe-area-inset-bottom))] px-4 z-40">
      <div className="mx-auto max-w-[390px] w-full relative">
        {/* glow под кнопкой */}
        <div className="absolute inset-0 h-12 p-3 bg-gradient-to-b from-orange-400/75 to-amber-700/75 rounded-xl blur-[2.5px] -z-10 pointer-events-none" />
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="h-12 w-full bg-gradient-to-b from-orange-400 to-amber-700 rounded-xl shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] text-white font-semibold [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] transition-transform duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0"
        >
          Create Battle
        </button>
      </div>
    </div>
  )
}
