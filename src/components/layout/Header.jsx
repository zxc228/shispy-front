import { useNavigate } from 'react-router-dom'
export default function Header() {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10">
      <div className="px-4 h-12 flex items-center justify-between">
        <button onClick={() => nav(-1)} className="text-sm opacity-80">← Back</button>
        <div className="font-semibold">Shipsy</div>
        <a href="/add" className="text-sm opacity-80">Add</a>
      </div>
    </header>
  )
}
