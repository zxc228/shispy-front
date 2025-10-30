import { useEffect, useMemo, useState } from "react";
import EmptyGiftSvg from "../../components/icons/EmptyGift.svg";
import TonSvg from "../../components/icons/TonIcon.svg";
import { getTreasuryGifts } from "../../shared/api/treasury.api";
import TgsSticker from "../../components/common/TgsSticker";
import ChestTgs from "../../components/tgs/Chest.tgs";
import { transformGiftsData } from "../../shared/utils/gifts";

export default function TreasurePage() {
  // My gifts loaded from backend
  const [myItems, setMyItems] = useState([]);
  const [gwc, setGwc] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const res = await getTreasuryGifts();
        if (cancelled) return;
        
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
        if (cancelled) return;
        setError("Не удалось загрузить подарки");
        console.error('Failed to load treasury gifts:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
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

  return (
    <main className="px-2.5 pt-2 pb-[138px]">
      {/* Вкладки */}
      <Tabs active={tab} onChange={(t) => { setTab(t); setSelectedStoreId(null); }} />

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
              {/* Add new Treasure как первая карточка (неактивна) */}
              <AddNewTreasureCardInGrid />
              {/* Остальные подарки */}
              {myItems.map((it) => (
                <MyTreasureCard 
                  key={it.id} 
                  title={it.slug} 
                  tgsUrl={it.tgsUrl} 
                  value={it.value}
                  slug={it.slug}
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

function AddNewTreasureCardInGrid() {
  return (
    <div className="rounded-[10px] p-[1px] bg-neutral-700/50">
      <div
        className="relative rounded-[10px] min-h-32 bg-neutral-800/30 border border-dashed border-neutral-600
                   opacity-50 cursor-not-allowed
                   flex flex-col items-center justify-center px-2 py-3"
        title="Функция будет доступна позже"
      >
        {/* Иконка плюса */}
        <div className="w-10 h-10 rounded-full bg-neutral-700/50 grid place-items-center">
          <span className="text-2xl text-neutral-400">+</span>
        </div>
        <span className="text-xs font-medium text-neutral-400 text-center mt-2">
          Add new
        </span>
      </div>
    </div>
  );
}

function Grid3({ children }) {
  return <div className="grid grid-cols-3 gap-1">{children}</div>;
}

/* --------- Cards --------- */

// Inventory card with TGS sticker support
function MyTreasureCard({ title, tgsUrl, value, slug }) {
  return (
    <div className="rounded-[10px] p-[1px] bg-[linear-gradient(135deg,#f59e0b,#ef4444)]">
      <div className="relative rounded-[10px] min-h-32 bg-neutral-800/30 border border-neutral-700
                      flex flex-col items-center justify-center px-2 py-3">
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
      </div>
    </div>
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
      window.Telegram.WebApp.openTelegramLink('https://t.me/shipsy_treasures')
    } else {
      window.open('https://t.me/shipsy_treasures', '_blank')
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
            @shipsy_treasures
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
