import { useEffect, useMemo, useState } from "react";
import EmptyGiftSvg from "../../components/icons/EmptyGift.svg";
import TonSvg from "../../components/icons/TonIcon.svg";
import { getTreasuryGifts } from "../../shared/api/treasury.api";

export default function TreasurePage() {
  // My gifts loaded from backend
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const res = await getTreasuryGifts();
        if (cancelled) return;
        const gifts = Array.isArray(res) ? res : [];
        // map gifts to UI items
        setMyItems(
          gifts.map((g, idx) => {
            const rawPhoto = g?.photo || null;
            // Если backend возвращает base64 без data: префикса — добавим его
            const photo = typeof rawPhoto === 'string' && rawPhoto.length > 0
              ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')
                  ? rawPhoto
                  : `data:image/png;base64,${rawPhoto}`)
              : null;

            return {
              id: g?.gid ?? idx,
              title: g?.slug || "Treasure",
              priceTon: Number(g?.value ?? 0),
              photo,
            }
          })
        );
      } catch (e) {
        if (cancelled) return;
        setError("Не удалось загрузить подарки");
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
          {/* Сетка инвентаря с Add карточкой первой */}
          <Grid3>
            {/* Add new Treasure как первая карточка (неактивна) */}
            <AddNewTreasureCardInGrid />
            {/* Остальные подарки */}
            {myItems.map((it) => (
              <MyTreasureCard key={it.id} title={it.title} photo={it.photo} priceTon={it.priceTon} />
            ))}
          </Grid3>
          {/* Показываем empty state если нет подарков */}
          {myItems.length === 0 && (
            <div className="mt-4">
              <EmptyInventory />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Shipsy Treasures — пока в разработке */}
          <div className="h-[320px] rounded-2xl border border-neutral-700 grid place-items-center text-white/70">
            Shipsy Treasures — в разработке
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

// Inventory card (простая заглушка со свето-рамкой)
function MyTreasureCard({ title, photo, priceTon }) {
  return (
    <div className="rounded-[10px] p-[1px] bg-[linear-gradient(135deg,#f59e0b,#ef4444)]">
      <div className="relative rounded-[10px] min-h-32 bg-neutral-800/30 border border-neutral-700
                      flex flex-col items-center justify-center px-2 py-3">
        <img
          src={photo || EmptyGiftSvg}
          alt="Treasure"
          className="w-10 h-10 opacity-80 object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = EmptyGiftSvg; }}
        />
        {/* Только число без названия и без TON-текста */}
        <div className="mt-2 text-base font-semibold text-white">
          {Number(priceTon ?? 0).toFixed(2)}
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
  return (
    <div className="h-[320px] rounded-2xl flex flex-col items-center justify-center gap-4">
      <div className="text-7xl text-neutral-50">😔</div>
      <div className="text-center">
        <div className="text-neutral-50 text-lg font-semibold leading-snug">Inventory empty</div>
        <div className="text-base leading-snug">
          <span className="text-neutral-50">You can add your Treasure or </span>
          <span className="text-orange-400">buy them in the store</span>
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
