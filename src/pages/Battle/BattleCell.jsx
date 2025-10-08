import CellBattleIcon from '../../components/icons/CellBattleIcon.svg'

export default function BattleCell({ id, state, disabled, onSelect, showSpinner, showBadge }) {
  const base = "aspect-square w-full rounded-xl outline outline-1 outline-neutral-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] relative overflow-hidden";

  const selectedClasses = "bg-gradient-to-b from-orange-400/0 to-orange-400/20 shadow-[0_0_25px_rgba(200,109,55,0.25)] outline-orange-400";
  const hitClasses = "outline-green-500 shadow-[0_0_20px_rgba(34,197,94,.35)]";
  const missClasses = "outline-red-500";
  const disabledClasses = disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-[0.99] transition-transform";

  const stateClasses =
    state === 'selected' ? selectedClasses :
    state === 'hit' ? hitClasses :
    state === 'miss' ? missClasses :
    '';

  return (
    <button
      type="button"
      aria-pressed={state === 'selected'}
      disabled={disabled}
      onClick={() => onSelect?.(id)}
      className={[base, stateClasses, disabledClasses].join(' ')}
    >
      {/* base icon */}
      <div className="absolute inset-0 grid place-items-center">
        <img src={CellBattleIcon} alt="Cell" className="w-7 h-7 opacity-80" />
      </div>

      {/* spinner overlay */}
      {showSpinner && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* status badge */}
      {showBadge?.type === 'miss' && (
        <span className="absolute left-1 top-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
          <span className="w-3 h-3 rounded-full bg-red-500 grid place-items-center">
            <span className="w-1.5 h-0.5 bg-white rotate-45" />
            <span className="w-1.5 h-0.5 bg-white -rotate-45 -mt-[2px]" />
          </span>
          Miss
        </span>
      )}
      {showBadge?.type === 'hit' && (
        <span className="absolute left-1 top-1 inline-flex items-center gap-1 text-[11px] font-semibold text-green-400">
          <span className="w-3 h-3 rounded-full bg-green-500 grid place-items-center">
            <span className="w-1 h-1.5 border-l-2 border-b-2 border-white rotate-[-45deg]" />
          </span>
          Hit
        </span>
      )}
    </button>
  );
}
