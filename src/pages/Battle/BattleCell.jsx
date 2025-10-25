import CellBattleIcon from '../../components/icons/CellBattleIcon.svg'

export default function BattleCell({ id, state, disabled, onSelect, showSpinner, showBadge, isAttacking }) {
  const base = "aspect-square w-full rounded-xl outline outline-1 outline-neutral-700 shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,#222_0%,#111_100%)] relative overflow-hidden transition-all duration-300";

  const selectedClasses = "bg-gradient-to-b from-orange-400/0 to-orange-400/20 shadow-[0_0_25px_rgba(200,109,55,0.25)] outline-orange-400";
  const attackingClasses = "outline-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] animate-[pulse_0.5s_ease-in-out_infinite]";
  const hitClasses = "outline-green-500 shadow-[0_0_20px_rgba(34,197,94,.35)] animate-[pulse_0.5s_ease-in-out]";
  const missClasses = "outline-red-500 animate-[shake_0.3s_ease-in-out]";
  const disabledClasses = disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-[0.99] transition-transform";

  const stateClasses =
    isAttacking ? attackingClasses :
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
        <span className="absolute left-1 top-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 animate-[fadeIn_0.3s_ease-out]">
          <span className="w-3 h-3 rounded-full bg-red-500 grid place-items-center animate-[ping_0.5s_ease-out]">
            <span className="w-1.5 h-0.5 bg-white rotate-45" />
            <span className="w-1.5 h-0.5 bg-white -rotate-45 -mt-[2px]" />
          </span>
          Miss
        </span>
      )}
      {showBadge?.type === 'hit' && (
        <>
          {/* Explosion effect for hit */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-radial from-green-400/40 via-green-500/20 to-transparent animate-[ping_0.6s_ease-out]" />
            <div className="absolute inset-0 bg-gradient-radial from-yellow-400/30 via-orange-500/15 to-transparent animate-[ping_0.4s_ease-out_0.1s]" />
          </div>
          <span className="absolute left-1 top-1 inline-flex items-center gap-1 text-[11px] font-semibold text-green-400 animate-[fadeIn_0.3s_ease-out] z-10">
            <span className="w-3 h-3 rounded-full bg-green-500 grid place-items-center animate-[bounce_0.5s_ease-out]">
              <span className="w-1 h-1.5 border-l-2 border-b-2 border-white rotate-[-45deg]" />
            </span>
            Hit
          </span>
        </>
      )}
    </button>
  );
}
