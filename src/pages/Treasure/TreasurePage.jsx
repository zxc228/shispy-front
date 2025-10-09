import { useMemo, useState } from "react";
import EmptyGiftSvg from "../../components/icons/EmptyGift.svg";
import TonSvg from "../../components/icons/TonIcon.svg";

export default function TreasurePage() {
  // 👉 сменой массива на [] проверишь «пустое» состояние инвентаря
  const myItems = useMemo(
    () =>
      
      // Array.from({ length: 9 }, (_, i) => ({
      //   id: i + 1,
      //   title: "Treasure",
      // })),
    []
  );

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

      {tab === "my" ? (
        myItems.length ? (
          <>
            {/* Слот Add new Treasure */}
            <AddNewTreasureCard onAdd={() => { /* TODO: open add flow */ }} />
            {/* Сетка инвентаря */}
            <Grid3>
              {myItems.map((it) => (
                <MyTreasureCard key={it.id} title={it.title} />
              ))}
            </Grid3>
          </>
        ) : (
          <EmptyInventory onAdd={() => { /* TODO: open add flow */ }} />
        )
      ) : (
        <>
          {/* Сетка магазина Shipsy с выбором */}
          <Grid3>
            {storeItems.map((it) => (
              <StoreCard
                key={it.id}
                title={it.title}
                priceTon={it.priceTon}
                selected={selectedStoreId === it.id}
                onSelect={() =>
                  setSelectedStoreId((prev) => (prev === it.id ? null : it.id))
                }
              />
            ))}
          </Grid3>

          {/* Кнопка покупки — как в макете, появляется когда есть выбор */}
          <BuyBar
            visible={canBuy}
            label={`Buy for ${selectedItem?.priceTon.toFixed(2)} TON`}
            onClick={() => {
              // TODO: вызов покупки selectedItem
              // console.log("Buy", selectedItem);
            }}
          />
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

function AddNewTreasureCard({ onAdd }) {
  return (
    <button
      onClick={onAdd}
      className="w-full mb-2 h-28 relative rounded-[10px] overflow-hidden p-[1px] 
                 outline outline-1 outline-offset-[-1px] outline-orange-400 text-orange-400
                 active:scale-95 transition-transform"
    >
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-medium">
        Add new Treasure
      </span>
    </button>
  );
}

function Grid3({ children }) {
  return <div className="grid grid-cols-3 gap-1">{children}</div>;
}

/* --------- Cards --------- */

// Inventory card (простая заглушка со свето-рамкой)
function MyTreasureCard({ title }) {
  return (
    <div className="rounded-[10px] p-[1px] bg-[linear-gradient(135deg,#f59e0b,#ef4444)]">
      <div className="rounded-[10px] min-h-32 bg-neutral-800/30 border border-neutral-700
                      flex flex-col items-center justify-center px-2 py-3">
        <img src={EmptyGiftSvg} alt="Treasure placeholder" className="w-10 h-10 opacity-80" />
        <p className="mt-2 text-[13px] font-medium text-white">{title}</p>
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

function EmptyInventory({ onAdd }) {
  return (
    <div className="h-[420px] rounded-2xl flex flex-col items-center justify-center gap-4">
      <div className="text-7xl text-neutral-50">😔</div>
      <div className="text-center">
        <div className="text-neutral-50 text-lg font-semibold leading-snug">Inventory empty</div>
        <div className="text-base leading-snug">
          <span className="text-neutral-50">You can add your Treasure or </span>
          <span className="text-orange-400">buy them in the store</span>
        </div>
      </div>
      <button
        onClick={onAdd}
        className="h-12 px-4 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 
                   shadow-[inset_0_-1px_0_rgba(230,141,74,1)] text-white font-semibold
                   active:scale-95 transition-transform [text-shadow:_0_1px_25px_rgba(0,0,0,.25)]"
      >
        Click here to add Treasure
      </button>
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
