import PromoCodeSection from './PromoCodeSection'

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-[390px] space-y-3">

      {/* AVATAR + NAME / WALLET */}
      <section className="flex flex-col items-center gap-2 mt-1">
        <div className="w-24 h-24 relative rounded-3xl">
          <span className="w-14 h-14 left-[48px] top-0 absolute rounded-3xl outline outline-2 outline-offset-[-1.04px] outline-orange-400 blur-[5.21px]" />
          <img
            className="w-24 h-24 left-0 top-0 absolute rounded-3xl border-2 border-zinc-500 object-cover"
            src="https://placehold.co/100x100"
            alt="avatar"
          />
          <span className="w-14 h-14 left-[49px] -top-px absolute overflow-hidden">
            <span className="w-24 h-24 -left-[48px] top-0 absolute rounded-3xl border-4 border-orange-400" />
          </span>
        </div>

        <div className="w-full flex flex-col items-center gap-1">
          <div className="w-full text-center text-neutral-50 text-base font-normal font-['SF_Pro_Display']">
            Maks_movv.dsgn1324134
          </div>
          <div className="text-center text-neutral-700 text-xs font-normal font-['SF_Pro_Display']">
            КОШЕЛЕК1234
          </div>
        </div>
      </section>

      {/* XP + LEVEL */}
      <section className="w-full px-2.5">
        <div className="w-full flex items-center justify-between">
          <div className="text-neutral-700 text-xs font-normal font-['SF_Pro_Display']">100/1000 xp</div>
          <div className="flex items-center gap-[5px]">
            <div className="text-neutral-700 text-xs font-normal font-['SF_Pro_Display']">Level 22</div>
            <div className="px-1 py-0.5 bg-gradient-to-b from-orange-400 to-amber-700 rounded flex items-center">
              <div className="text-white text-xs font-normal font-['SF_Pro_Display']">Pro</div>
            </div>
          </div>
        </div>
        <div className="mt-1 h-2 relative bg-neutral-800 rounded-full outline outline-1 outline-neutral-700 overflow-hidden">
          <div className="w-24 h-2 px-1 py-0.5 left-0 top-0 absolute bg-gradient-to-b from-orange-400 to-amber-700 rounded-[100px]" />
        </div>
      </section>

      {/* STATS (3 CARDS) */}
      <section className="w-full px-2.5 grid grid-cols-3 gap-2">
        {/* Win games */}
        <div className="p-3 relative bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-offset-[-1px] outline-neutral-700 flex flex-col justify-center gap-1 overflow-hidden">
          <div className="inline-flex items-start gap-1">
            <div className="text-orange-400 text-xl font-medium font-['SF_Pro_Display']">87 %</div>
          </div>
          <div className="text-white/50 text-xs font-normal font-['SF_Pro_Display']">Win games</div>
        </div>
        {/* All games */}
        <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-offset-[-1px] outline-neutral-700 flex flex-col justify-center gap-1 overflow-hidden">
          <div className="flex items-start gap-1">
            <div className="text-neutral-50 text-xl font-medium font-['SF_Pro_Display']">20</div>
          </div>
          <div className="text-white/50 text-xs font-normal font-['SF_Pro_Display']">All games</div>
        </div>
        {/* Wons TON */}
        <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-offset-[-1px] outline-neutral-700 flex flex-col justify-center gap-1 overflow-hidden">
          <div className="inline-flex items-end gap-1">
            <div className="text-neutral-50 text-xl font-medium font-['SF_Pro_Display']">1.00</div>
            <div className="w-4 h-7 relative">
              <div className="w-2 h-2 left-0 top-[14px] absolute bg-sky-500 rounded" />
              <div className="w-1 h-1 left-[2.25px] top-[16px] absolute bg-white rounded-full" />
            </div>
          </div>
          <div className="text-white/50 text-xs font-normal font-['SF_Pro_Display']">Wons TON</div>
        </div>
      </section>

      {/* REFERRAL */}
      <section className="w-full px-2.5">
        <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-offset-[-1px] outline-neutral-700 flex flex-col gap-3 overflow-hidden">
          <div className="w-full flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-neutral-50 text-base font-semibold font-['SF_Pro_Display']">Referal System</div>
              <div className="text-neutral-700 text-xs font-normal font-['SF_Pro_Display']">Invite your friends and get TON</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="inline-flex items-center gap-2">
                <div className="text-neutral-50 text-base font-semibold font-['SF_Pro_Display']">2.10</div>
                <div className="w-4 h-4 bg-sky-500 rounded" />
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <div className="text-neutral-700 text-xs font-normal font-['SF_Pro_Display']">5 referals</div>
            </div>
          </div>

          <div className="w-full flex items-center gap-3">
            <div className="h-12 p-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-50 flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-40 text-neutral-50/25 text-base font-semibold font-['SF_Pro_Display'] [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">
                  T.me/ShipsyRef12354
                </div>
                <div className="w-6 h-6 relative">
                  <div className="w-5 h-5 left-[2.56px] top-[2.56px] absolute bg-gradient-to-b from-orange-400 to-amber-700 rounded" />
                </div>
              </div>
            </div>

            <button
              className="flex-1 h-12 pl-4 pr-3 py-3 bg-gradient-to-l from-white to-gray-200 rounded-xl shadow-[inset_0_-1px_0_0_rgba(206,196,189,1)] flex items-center justify-center gap-1"
              aria-label="Bring out"
            >
              <span className="text-neutral-800 text-base font-semibold font-['SF_Pro_Display'] [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">
                Bring out
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* PROMO CODE */}
      <PromoCodeSection />

      {/* STREAMER MODE */}
      <section className="w-full px-2.5">
        <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-offset-[-1px] outline-neutral-700 flex flex-col gap-3 overflow-hidden">
          <div className="w-full flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-neutral-50 text-base font-semibold font-['SF_Pro_Display']">Streamer Mode</div>
              <div className="text-neutral-700 text-xs font-normal font-['SF_Pro_Display']">
                Hides everything you<br />can be streamsniped with
              </div>
            </div>
            <div className="w-20 p-0.5 bg-gradient-to-b from-orange-400 to-amber-700 rounded-xl flex justify-end">
              <div className="w-10 h-10 py-3 bg-neutral-50 rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* GAME HISTORY */}
      <section className="w-full px-6 pt-3 pb-5 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-t-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700 space-y-2">
        <div className="text-neutral-50 text-base font-semibold font-['SF_Pro_Display']">Game history</div>

        {/* tabs (визуально) */}
        <div className="flex gap-1.5">
          <div className="h-10 p-3 bg-neutral-700 rounded-xl flex items-center">
            <div className="text-white text-sm font-bold font-['SF_Pro_Display']">New</div>
          </div>
          <div className="h-10 p-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-700 flex items-center">
            <div className="text-white text-sm font-bold font-['SF_Pro_Display']">Last</div>
          </div>
          <div className="h-10 p-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-700 flex items-center">
            <div className="text-white text-sm font-bold font-['SF_Pro_Display']">Wins</div>
          </div>
          <div className="h-10 p-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-700 flex items-center">
            <div className="text-white text-sm font-bold font-['SF_Pro_Display']">Lose</div>
          </div>
          <div className="h-10 p-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-700 flex items-center">
            <div className="text-white text-sm font-bold font-['SF_Pro_Display']">More bid</div>
          </div>
        </div>

        {/* items */}
        <div className="space-y-2">
          {/* Win */}
          <div className="w-80 p-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-green-500 flex justify-between items-end overflow-hidden">
            <div className="inline-flex flex-col justify-end gap-1">
              <div className="inline-flex items-center gap-1">
                <img className="w-8 h-8 rounded-lg" src="https://placehold.co/33x33" alt="opponent" />
                <div className="inline-flex flex-col justify-center gap-0.5">
                  <div className="text-white text-sm font-light font-['SF_Pro_Display'] [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">
                    Maks_movv.dsgn1324134
                  </div>
                  <div className="text-zinc-100/25 text-[10px] font-light font-['SF_Pro_Display'] [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">
                    Jan 13, 2025
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2 bg-neutral-800 rounded-[10px]">
              <div className="inline-flex items-center gap-1">
                <div className="text-green-500 text-sm font-semibold font-['SF_Pro_Display']">+2.10</div>
                <div className="w-3.5 h-3.5 bg-sky-500 rounded" />
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </div>

          {/* Loss */}
          {[1,2,3].map((i) => (
            <div key={i} className="w-80 p-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-red-700 flex justify-between items-end overflow-hidden">
              <div className="inline-flex flex-col justify-end gap-1">
                <div className="inline-flex items-center gap-1">
                  <img className="w-8 h-8 rounded-lg" src="https://placehold.co/33x33" alt="opponent" />
                  <div className="inline-flex flex-col justify-center gap-0.5">
                    <div className="text-white text-sm font-light font-['SF_Pro_Display'] [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">
                      Maks_movv.dsgn1324134
                    </div>
                    <div className="text-zinc-100/25 text-[10px] font-light font-['SF_Pro_Display'] [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">
                      Jan 13, 2025
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-neutral-800 rounded-[10px]">
                <div className="inline-flex items-center gap-1">
                  <div className="text-red-700 text-sm font-semibold font-['SF_Pro_Display']">-2.10</div>
                  <div className="w-3.5 h-3.5 bg-sky-500 rounded" />
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-2" />
    </div>
  )
}
