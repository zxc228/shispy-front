import { useEffect, useMemo, useState } from "react";
import EmptyGiftSvg from "../../components/icons/EmptyGift.svg";
import TonSvg from "../../components/icons/TonIcon.svg";
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
  
  const { refresh: refreshBalance } = useBalance();

  const loadGifts = async () => {
    try {
      setLoading(true);
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
      setError("Не удалось загрузить подарки");
      console.error('Failed to load treasury gifts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await loadGifts();
    }
    run();
    return () => { cancelled = true };
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
  
  // Handle withdrawal
  const handleWithdraw = async () => {
    if (selectedGids.length === 0) return;
    
    try {
      setWithdrawing(true);
      await postWithdrawal(selectedGids);
      
      // Show success and reload
      setShowWithdrawModal(false);
      setSelectedGids([]);
      
      // Refresh balance and gifts
      await Promise.all([
        refreshBalance(true),
        loadGifts()
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
    <main className="px-2.5 pt-2 pb-[138px]">
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
        <div className="animate-[fadeIn_0.3s_ease-out]">
          {/* Показываем empty state если нет подарков */}
          {myItems.length === 0 ? (
            <EmptyInventory />
          ) : (
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
  return (
    <button
      onClick={onClick}
      className="rounded-[10px] p-[1px] bg-neutral-700/50 hover:bg-neutral-600/50 transition-colors active:scale-95"
    >
      <div
        className="relative rounded-[10px] min-h-32 bg-neutral-800/30 border border-dashed border-neutral-600
                   hover:border-neutral-500
                   flex flex-col items-center justify-center px-2 py-3 transition-colors cursor-pointer"
      >
        {/* Иконка плюса */}
        <div className="w-10 h-10 rounded-full bg-neutral-700/50 grid place-items-center">
          <span className="text-2xl text-neutral-400">+</span>
        </div>
        <span className="text-xs font-medium text-neutral-400 text-center mt-2">
          Add new
        </span>
      </div>
    </button>
  );
}

function Grid3({ children }) {
  return <div className="grid grid-cols-3 gap-1">{children}</div>;
}

/* --------- Cards --------- */

// Inventory card with TGS sticker support
function MyTreasureCard({ title, tgsUrl, value, slug, gid, selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={[
        "rounded-[10px] p-[1px] transition-all active:scale-95",
        selected 
          ? "bg-[linear-gradient(135deg,#f59e0b,#ef4444)] shadow-[0_0_20px_rgba(245,158,11,0.4)]" 
          : "bg-[linear-gradient(135deg,#f59e0b,#ef4444)]"
      ].join(" ")}
    >
      <div className={[
        "relative rounded-[10px] min-h-32 border flex flex-col items-center justify-center px-2 py-3",
        selected 
          ? "bg-neutral-800/50 border-orange-400/50" 
          : "bg-neutral-800/30 border-neutral-700"
      ].join(" ")}>
        {/* Selection indicator */}
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-400 border-2 border-white grid place-items-center">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="text-white">
              <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        
        {/* TGS Sticker Animation */}
        {tgsUrl ? (
          <TgsSticker
            src={tgsUrl}
            width={40}
            height={40}
            loop={true}
            autoplay={true}
            className="opacity-80"
          />
        ) : (
          <img
            src={EmptyGiftSvg}
            alt="Treasure"
            className="w-10 h-10 opacity-80 object-contain"
          />
        )}
        {/* Price display */}
        <div className="mt-2 text-base font-semibold text-white">
          {Number(value ?? 0).toFixed(2)}
        </div>
        {/* GID badge */}
        <div className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-neutral-900/60 text-neutral-400 font-mono">
          {slug || 'N/A'}
        </div>
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
        <img src={EmptyGiftSvg} alt="Treasure placeholder" className="w-10 h-10 opacity-80" />
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

function WithdrawBar({ count, value, onClick }) {
  return (
    <div className="fixed left-0 right-0 bottom-[72px] px-2.5 z-10">
      <button
        onClick={onClick}
        className="mx-auto max-w-md w-full h-14 px-4 rounded-xl 
                   bg-gradient-to-b from-orange-400 to-amber-700 
                   shadow-[inset_0_-1px_0_0_rgba(230,141,74,1),0_4px_20px_rgba(245,158,11,0.3)]
                   text-white font-semibold [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60
                   active:translate-y-[0.5px] active:scale-[0.98]
                   transition-transform flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">Withdraw {count} gift{count > 1 ? 's' : ''}</span>
        </span>
        <span className="flex items-center gap-1.5 text-lg font-bold">
          {value.toFixed(2)}
          <img src={TonSvg} alt="TON" className="w-5 h-5 object-contain" />
        </span>
      </button>
    </div>
  );
}

/* --------- Withdraw confirmation modal --------- */

function WithdrawModal({ count, value, loading, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 animate-[fadeIn_0.2s_ease-out] px-4">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-700 max-w-sm w-full p-6 space-y-4 animate-[slideUp_0.3s_ease-out]">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-amber-700 grid place-items-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center">
          Confirm Withdrawal
        </h2>
        
        {/* Description */}
        <div className="space-y-2 text-center">
          <p className="text-neutral-300">
            You are about to withdraw <span className="font-semibold text-white">{count} gift{count > 1 ? 's' : ''}</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-orange-400">
            {value.toFixed(2)}
            <img src={TonSvg} alt="TON" className="w-6 h-6 object-contain" />
          </div>
          <p className="text-sm text-neutral-400">
            The amount will be added to your balance
          </p>
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
                <span>Processing...</span>
              </>
            ) : (
              'Confirm'
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
