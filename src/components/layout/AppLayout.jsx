import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="h-[var(--tg-vh,100dvh)] bg-black text-white flex flex-col">
      <Header />
      {/* общий скролл-контейнер для ВСЕХ страниц */}
      <main
        className="flex-1 overflow-y-auto px-4 py-4 pb-24 max-w-[390px] w-full mx-auto scrollbar-invisible scrollbar-stable [overscroll-behavior:contain] [-webkit-overflow-scrolling:touch]"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
