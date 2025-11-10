import { useEffect, useMemo, useState } from "react";
import TonSvg from "../../components/icons/TonIcon.svg";
import DollarIcon from "../../components/icons/DollarIcon.svg";
import { getTreasuryGifts, postWithdrawal } from "../../shared/api/treasury.api";
import TgsSticker from "../../components/common/TgsSticker";
import ChestTgs from "../../components/tgs/Chest.tgs";
import { transformGiftsData } from "../../shared/utils/gifts";
import { useBalance } from "../../providers/BalanceProvider";

export default function TreasurePage() {
  // My gifts loaded from backend
  const [myItems, setMyItems] = useState([]);
  const [gwc, setGwc] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Selection state for withdrawal
  const [selectedGids, setSelectedGids] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  
  // Add new gift instruction modal
  const [showAddInstructionModal, setShowAddInstructionModal] = useState(false);
  
  const { refresh: refreshBalance, amount: balance } = useBalance();

  const loadGifts = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const res = await getTreasuryGifts();
      
      // Debug: log raw response
      console.log('🎁 Treasury gifts raw response:', JSON.stringify(res, null, 2));
      console.log('🎁 GWC:', res.gwc);
      console.log('🎁 Gifts array:', res.gifts);
      res.gifts?.forEach((gift, idx) => {
        console.log(`🎁 Gift ${idx}:`, {
          gid: gift.gid,
          value: gift.value,
          slug: gift.slug
        });
      });
      
      // New API returns: { gwc: number, gifts: [{ gid, value, slug }] }
      setGwc(res.gwc || 0);
      const transformedGifts = transformGiftsData(res.gifts || []);
      console.log('🎁 Transformed gifts:', transformedGifts);
      setMyItems(transformedGifts);
    } catch (e) {
      if (showLoading) {
        setError("Не удалось загрузить подарки");
      }
      console.error('Failed to load treasury gifts:', e);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Initial load (with loading state)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      await loadGifts(true);
    }
    run();
    return () => { cancelled = true };
  }, []);

  // Auto-refresh on window focus (silent)
  useEffect(() => {
    const handleFocus = () => {
      loadGifts(false);
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadGifts(false);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Polling every 10 seconds (silent background refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      loadGifts(false);
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // 👉 магазинные предметы (одинаковые карточки с ценником)
  const storeItems = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: i + 1,
        title: "Treasure",
        priceTon: 2.1,
      })),
    []
  );

  const [tab, setTab] = useState("my");
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  const selectedItem = storeItems.find((x) => x.id === selectedStoreId) || null;
  const canBuy = tab === "shipsy" && !!selectedItem;
  
  // Toggle gift selection
  const toggleGiftSelection = (gid) => {
    setSelectedGids(prev => 
      prev.includes(gid) 
        ? prev.filter(id => id !== gid)
        : [...prev, gid]
    );
  };
  
  // Calculate total value of selected gifts
  const selectedValue = useMemo(() => {
    return myItems
      .filter(item => selectedGids.includes(item.gid))
      .reduce((sum, item) => sum + (item.value || 0), 0);
  }, [myItems, selectedGids]);
  
  // Check if balance is sufficient for withdrawal
  const minWithdrawBalance = Number(import.meta.env.VITE_MIN_WITHDRAW_BALANCE) || 0.2;
  const hasInsufficientWithdrawBalance = balance < minWithdrawBalance;
  
  // Handle withdrawal
  const handleWithdraw = async () => {
    if (selectedGids.length === 0) return;
    
    // Check minimum balance for withdrawal commission
    const minWithdrawBalance = Number(import.meta.env.VITE_MIN_WITHDRAW_BALANCE) || 0.2;
    if (balance < minWithdrawBalance) {
      console.warn('TreasurePage: insufficient balance for withdrawal', { balance, required: minWithdrawBalance });
      setError(`Insufficient balance. Minimum ${minWithdrawBalance} TON required for withdrawal commission.`);
      setShowWithdrawModal(false);
      return;
    }
    
    try {
      setWithdrawing(true);
      await postWithdrawal(selectedGids);
      
      // Show success and reload
      setShowWithdrawModal(false);
      setSelectedGids([]);
      
      // Refresh balance and gifts (with loading state)
      await Promise.all([
        refreshBalance(true),
        loadGifts(false)
      ]);
      
      // Show success feedback
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (e) {
      console.error('Withdrawal failed:', e);
      setError("Не удалось выполнить вывод");
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <main className="px-2.5 pt-2 pb-[calc(184px+env(safe-area-inset-bottom))]">
      {/* Вкладки */}
      <Tabs active={tab} onChange={(t) => { setTab(t); setSelectedStoreId(null); setSelectedGids([]); }} />

      {loading ? (
        // Skeleton loading state
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <div className="mb-3 h-[120px] rounded-2xl bg-neutral-800/50 animate-pulse" />
          <Grid3>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-neutral-800/50 animate-pulse" />
            ))}
          </Grid3>
        </div>
      ) : tab === "my" ? (
        <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
          {/* Показываем empty state если нет подарков */}
          {myItems.length === 0 ? (
            <EmptyInventory />
          ) : (
            <>
              <div className="px-1 flex items-center justify-between">
                <h2 className="text-xl font-medium leading-none text-neutral-50">
                  My Treasures
                </h2>
                {selectedGids.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGids([])}
                    className="text-sm text-orange-400 hover:text-orange-300 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <span>Clear</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
              <Grid3>
                {/* Add new Treasure как первая карточка */}
                <AddNewTreasureCardInGrid onClick={() => setShowAddInstructionModal(true)} />
                {/* Остальные подарки */}
                {myItems.map((it) => (
                  <MyTreasureCard 
                    key={it.id} 
                    title={it.slug} 
                    tgsUrl={it.tgsUrl} 
                    value={it.value}
                    slug={it.slug}
                    gid={it.gid}
                    selected={selectedGids.includes(it.gid)}
                    onToggle={() => toggleGiftSelection(it.gid)}
                  />
                ))}
              </Grid3>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Shipsy Treasures — пока в разработке */}
          <div className="h-[320px] rounded-2xl border border-neutral-700 grid place-items-center text-white/70">
            <div className="text-center space-y-2">
              <div className="text-5xl">🚧</div>
              <div>Shipsy Treasures — в разработке</div>
            </div>
          </div>
        </>
      )}
      
      {/* Withdrawal button */}
      {tab === "my" && selectedGids.length > 0 && (
        <WithdrawBar 
          count={selectedGids.length}
          value={selectedValue}
          onClick={() => setShowWithdrawModal(true)}
          onClose={() => setSelectedGids([])}
          disabled={hasInsufficientWithdrawBalance}
          minBalance={minWithdrawBalance}
        />
      )}
      
      {/* Withdrawal confirmation modal */}
      {showWithdrawModal && (
        <WithdrawModal
          count={selectedGids.length}
          value={selectedValue}
          loading={withdrawing}
          onConfirm={handleWithdraw}
          onCancel={() => setShowWithdrawModal(false)}
          commission={minWithdrawBalance}
        />
      )}
      
      {/* Add gift instruction modal */}
      {showAddInstructionModal && (
        <AddGiftInstructionModal onClose={() => setShowAddInstructionModal(false)} />
      )}
    </main>
  );
}

/* ================== UI blocks ================== */

function Tabs({ active, onChange }) {
  return (
    <div className="mb-3 p-0.5 rounded-xl bg-[radial-gradient(ellipse_79.53%_695.78%_at_3.18%_7.95%,#111_0%,#222_100%)] flex">
      <button
        className={`flex-1 py-3 rounded-xl text-base font-semibold transition-colors ${
          active === "my" ? "bg-neutral-700 text-neutral-50" : "text-neutral-50/70"
        }`}
        onClick={() => onChange("my")}
      >
        My treasures
      </button>
      <button
        className={`flex-1 py-3 rounded-xl text-base font-semibold transition-colors ${
          active === "shipsy" ? "bg-neutral-700 text-neutral-50" : "text-neutral-50/70"
        }`}
        onClick={() => onChange("shipsy")}
      >
        Shipsy Treasures
      </button>
    </div>
  );
}

function AddNewTreasureCardInGrid({ onClick }) {
  const baseSize = 'w-24 h-28';
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseSize} relative bg-black rounded-[10px] outline outline-1 outline-offset-[-1px] outline-orange-400 overflow-hidden active:scale-95 transition-transform hover:scale-105`}
    >
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-400 text-xs font-medium text-center leading-tight px-2">
        Add new<br/>Treasure
      </span>
    </button>
  );
}

function Grid3({ children }) {
  return <div className="grid grid-cols-3 gap-2 place-items-center">{children}</div>;
}

/* --------- Cards --------- */

// Inventory card with TGS sticker support (в стиле Create/Join)
function MyTreasureCard({ title, tgsUrl, value, slug, gid, selected, onToggle }) {
  const baseSize = 'w-24 h-28';
  
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`relative ${baseSize} rounded-[10px] border border-zinc-500 overflow-hidden transition-all duration-200 ${
        selected ? 'scale-105' : 'hover:scale-105 active:scale-95'
      }`}
    >
      {/* TGS Sticker or loading placeholder */}
      <div className="w-full h-full grid place-items-center p-2">
        {tgsUrl ? (
          <TgsSticker
            src={tgsUrl}
            width={60}
            height={60}
            loop={false}
            autoplay={false}
            className="opacity-90"
          />
        ) : (
          <span className="text-4xl opacity-60">⏳</span>
        )}
      </div>

      {/* Price badge (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-center pb-1">
        <div className="inline-flex items-center gap-1">
          <span className="text-white text-xs font-semibold">{Number(value ?? 0).toFixed(2)}</span>
          <img src={DollarIcon} alt="USD" className="w-3 h-3 object-contain" />
        </div>
      </div>

      {/* Selected state - градиентный подсвет + рамка */}
      {selected && (
        <span className="absolute inset-0 rounded-[10px] pointer-events-none bg-orange-400/25 shadow-[0_0_25px_0_rgba(200,109,55,0.50)] border-2 border-orange-400" />
      )}

      {/* Slug badge (top-left, smaller) */}
      <div className="absolute top-1 left-1 text-[8px] px-1 py-0.5 rounded bg-black/70 text-neutral-400 font-mono">
        {slug || 'N/A'}
      </div>
    </button>
  );
}

// Store card (как в макете: бейдж цены снизу-слева; при выборе — оранжевый glow + outline-2)
function StoreCard({
  title,
  priceTon,
  selected,
  onSelect,
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "relative w-full h-32 rounded-[10px] overflow-hidden transition-transform active:scale-95",
        selected
          ? "bg-gradient-to-b from-orange-400/0 to-orange-400/20 shadow-[0_0_25px_rgba(200,109,55,0.5)] outline outline-2 outline-offset-[-2px] outline-orange-400"
          : "bg-neutral-800/30 outline outline-1 outline-offset-[-1px] outline-neutral-700",
      ].join(" ")}
      aria-pressed={selected}
    >
      {/* Контент карточки */}
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-4xl opacity-60">⏳</span>
        <p className="sr-only">{title}</p>
      </div>

      {/* Бейдж цены снизу слева, как в фигме с тр-скруглением */}
      <div
        className={[
          "absolute left-[1px] bottom-[6px] pl-2 pr-2 py-1 rounded-tr-3xl inline-flex items-center gap-1.5",
          selected
            ? "bg-gradient-to-b from-orange-400 to-amber-700"
            : "bg-neutral-700",
        ].join(" ")}
      >
        <span className="text-neutral-50 text-sm font-normal">{priceTon.toFixed(2)}</span>
        <img src={TonSvg} alt="TON" className="w-3.5 h-3.5 object-contain" />
      </div>
    </button>
  );
}

/* --------- Empty state --------- */

function EmptyInventory() {
  const handleTreasureClick = () => {
    // Open Telegram channel/bot
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink('https://t.me/shipsy_treasure')
    } else {
      window.open('https://t.me/shipsy_treasure', '_blank')
    }
  }

  return (
    <div className="h-[320px] rounded-2xl flex flex-col items-center justify-center gap-4 px-4">
      <div className="w-24 h-24">
        <TgsSticker src={ChestTgs} autoplay loop />
      </div>
      <div className="text-center space-y-2">
        <div className="text-neutral-50 text-lg font-semibold leading-snug">
          You don't have any gifts
        </div>
        <div className="text-base leading-snug text-neutral-300">
          Send your gifts to{' '}
          <button
            onClick={handleTreasureClick}
            className="text-orange-400 font-medium hover:text-orange-300 active:text-orange-500 underline decoration-dotted underline-offset-2 transition-colors"
          >
            @shipsy_treasure
          </button>
        </div>
        <div className="text-sm leading-snug text-neutral-400 italic">
          💡 Before sending, send "hi" or a sticker first
        </div>
      </div>
    </div>
  );
}

/* --------- Buy bar (fixed over BottomNav) --------- */

function BuyBar({
  visible,
  label,
  onClick,
}) {
  if (!visible) return null;
  return (
    <div className="fixed left-0 right-0 bottom-[72px] px-2.5">
      <button
        onClick={onClick}
        className="mx-auto max-w-md w-full h-12 px-4 py-3 rounded-xl 
                   bg-gradient-to-b from-orange-400 to-amber-700 
                   shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)]
                   text-white font-semibold [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60
                   active:translate-y-[0.5px]"
      >
        {label}
      </button>
    </div>
  );
}

/* --------- Withdraw bar (fixed over BottomNav) --------- */

function WithdrawBar({ count, value, onClick, onClose, disabled = false, minBalance = 0.2 }) {
  return (
    <div className="fixed left-0 right-0 bottom-[calc(88px+env(safe-area-inset-bottom))] w-full z-40 px-2.5">
      <div className="mx-auto max-w-[390px] relative">
        <div className="rounded-2xl border border-neutral-700 pt-2 px-3 pb-2 bg-neutral-900 relative">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 active:scale-95 transition-all z-10"
            aria-label="Clear selection"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          {disabled && (
            <div className="mb-2 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="text-red-400 text-xs font-medium text-center">
                Insufficient balance. Minimum {minBalance} TON required for withdrawal commission.
              </div>
            </div>
          )}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="text-neutral-700 text-sm font-medium">Selected:</div>
            <div className="inline-flex items-center gap-2">
              <div className="text-neutral-50 text-lg font-medium">
                {count} {count === 1 ? 'gift' : 'gifts'}
              </div>
              <div className="h-7 px-2 bg-black rounded-xl inline-flex items-center gap-1.5 shrink-0">
                <span className="text-white text-base font-bold">
                  {value.toFixed(2)}
                </span>
                <img src={DollarIcon} alt="USD" className="w-4 h-4 object-contain" />
              </div>
            </div>
          </div>

          {/* Commission info */}
          <div className="mt-2 text-center text-xs text-neutral-500">
            Commission: {minBalance} TON will be deducted from your balance
          </div>

          <div className="mt-1.5 relative">
            <div className="absolute inset-0 h-11 p-2.5 bg-gradient-to-b from-orange-400/75 to-amber-700/75 rounded-xl blur-[2.5px] -z-10 pointer-events-none" />
            <button
              type="button"
              onClick={onClick}
              disabled={disabled}
              className="w-full h-11 px-4 py-2.5 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 text-white shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 active:translate-y-[0.5px] transition-transform duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0"
            >
              Send to Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------- Withdraw confirmation modal --------- */

function WithdrawModal({ count, value, loading, onConfirm, onCancel, commission = 0.2 }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 animate-[fadeIn_0.2s_ease-out] px-4">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-700 max-w-sm w-full p-6 space-y-4 animate-[slideUp_0.3s_ease-out]">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-amber-700 grid place-items-center">
          <span className="text-3xl">🎁</span>
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center">
          Send Gifts to Profile
        </h2>
        
        {/* Description */}
        <div className="space-y-3 text-center">
          <p className="text-neutral-300">
            Send <span className="font-semibold text-white">{count} gift{count > 1 ? 's' : ''}</span> to your Telegram profile
          </p>
          
          {/* Gift value display */}
          <div className="p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
            <div className="text-neutral-400 text-xs mb-1">Total gift value</div>
            <div className="flex items-center justify-center gap-2 text-xl font-bold text-white">
              {value.toFixed(2)}
              <img src={DollarIcon} alt="USD" className="w-5 h-5 object-contain" />
            </div>
          </div>
          
          {/* Commission info */}
          <div className="text-sm text-neutral-400 space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-orange-400">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16V12M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Commission {commission} TON will be deducted from your balance</span>
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-neutral-800 border border-neutral-700 
                       text-white font-semibold
                       hover:bg-neutral-700 active:scale-95
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-12 rounded-xl 
                       bg-gradient-to-b from-orange-400 to-amber-700 
                       shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)]
                       text-white font-semibold
                       active:scale-95 active:translate-y-[0.5px]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              'Send to Profile'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- Add Gift Instruction Modal --------- */

function AddGiftInstructionModal({ onClose }) {
  const handleTreasureClick = () => {
    // Open Telegram channel/bot
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink('https://t.me/shipsy_treasure')
    } else {
      window.open('https://t.me/shipsy_treasure', '_blank')
    }
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 animate-[fadeIn_0.2s_ease-out] px-4"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 rounded-2xl border border-neutral-700 max-w-sm w-full p-6 space-y-5 animate-[slideUp_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon with animation */}
        <div className="w-20 h-20 mx-auto">
          <TgsSticker src={ChestTgs} autoplay loop />
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center">
          How to Add Gifts
        </h2>
        
        {/* Instructions */}
        <div className="space-y-3 text-center">
          <p className="text-neutral-300 leading-relaxed">
            Send your gifts to{' '}
            <button
              onClick={handleTreasureClick}
              className="text-orange-400 font-semibold hover:text-orange-300 active:text-orange-500 underline decoration-dotted underline-offset-2 transition-colors"
            >
              @shipsy_treasure
            </button>
          </p>
          
          {/* Steps */}
          <div className="bg-neutral-800/50 rounded-xl p-4 space-y-3 text-left border border-neutral-700/50">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-400/20 text-orange-400 font-bold text-sm grid place-items-center flex-shrink-0">
                1
              </div>
              <div className="text-sm text-neutral-300">
                Send <span className="font-medium text-white">"hi"</span> or a sticker to the bot first
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-400/20 text-orange-400 font-bold text-sm grid place-items-center flex-shrink-0">
                2
              </div>
              <div className="text-sm text-neutral-300">
                Send your gifts one by one
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-400/20 text-orange-400 font-bold text-sm grid place-items-center flex-shrink-0">
                3
              </div>
              <div className="text-sm text-neutral-300">
                Your gifts will appear here automatically
              </div>
            </div>
          </div>
          
          <p className="text-xs text-neutral-500 italic">
            💡 Make sure to follow the order for successful delivery
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-neutral-800 border border-neutral-700 
                       text-white font-semibold
                       hover:bg-neutral-700 active:scale-95
                       transition-all"
          >
            Close
          </button>
          <button
            onClick={handleTreasureClick}
            className="flex-1 h-12 rounded-xl 
                       bg-gradient-to-b from-orange-400 to-amber-700 
                       shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)]
                       text-white font-semibold
                       active:scale-95 active:translate-y-[0.5px]
                       transition-all"
          >
            Open Bot
          </button>
        </div>
      </div>
    </div>
  );
}
