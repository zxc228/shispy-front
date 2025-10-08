import { useNavigate } from 'react-router-dom'

export default function CreateBattleCTA({ onClick }) {
  const navigate = useNavigate()
  const handleClick = () => (onClick ? onClick() : navigate('/create'))

  return (
    <div className="fixed left-0 right-0 bottom-[calc(80px+env(safe-area-inset-bottom))] px-4 z-40">
      <div className="mx-auto max-w-[390px] w-full relative">
        <button
          type="button"
          onClick={handleClick}
          className="h-12 w-full bg-gradient-to-l from-white to-gray-200 rounded-xl shadow-[inset_0_-1px_0_0_rgba(206,196,189,1)] text-neutral-800 font-semibold active:translate-y-[0.5px]"
        >
          Create Battle
        </button>
      </div>
    </div>
  )
}
