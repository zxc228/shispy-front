import { useNavigate } from 'react-router-dom'

export default function RulesPage() {
  const navigate = useNavigate()
  return (
    <div className="max-w-[390px] w-full mx-auto text-white">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">How to play</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
        >Back</button>
      </div>

      <div className="space-y-4 text-sm text-neutral-200">
        <section className="p-3 rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] border border-neutral-700/60">
          <h2 className="text-base font-semibold mb-2">Basics</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Choose gifts (your stake) and create a battle or join one.</li>
            <li>Each game is 1v1. You and your opponent hide 1 gift on a 4x4 grid.</li>
            <li>Take turns to guess the opponent’s cell. Hit to win the round.</li>
          </ul>
        </section>

        <section className="p-3 rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] border border-neutral-700/60">
          <h2 className="text-base font-semibold mb-2">Timing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Placing phase: limited time to pick your secret cell.</li>
            <li>Turns: 25 seconds per move, +3 seconds bonus for each move.</li>
            <li>If you disconnect, you have ~30 seconds to reconnect.</li>
          </ul>
        </section>

        <section className="p-3 rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] border border-neutral-700/60">
          <h2 className="text-base font-semibold mb-2">Stakes and rewards</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must stake gifts to create or join a battle.</li>
            <li>Winner receives the opponent’s staked gifts.</li>
            <li>Commission: 0.4 TON per game.</li>
          </ul>
        </section>

        <section className="p-3 rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] border border-neutral-700/60">
          <h2 className="text-base font-semibold mb-2">Fair play</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>One device per player: if you connect from another device, old sessions are disconnected.</li>
            <li>Session expires after inactivity. Stay active during your games.</li>
          </ul>
        </section>

        <section className="p-3 rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] border border-neutral-700/60">
          <h2 className="text-base font-semibold mb-2">Notes</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Names and labels are subject to change.</li>
            <li>Rules may update; watch for in-app notices.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
