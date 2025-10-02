import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="min-h-dvh bg-black text-white">
      <Header />
      <main className="px-4 py-4 pb-20"> {/* снизу запас под навбар */}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
