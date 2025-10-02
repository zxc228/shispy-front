import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import useAutoHideHeader from '../../hooks/useAutoHideHeader'

export default function AppLayout() {
  const { hidden, onScroll } = useAutoHideHeader()

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      <Header hidden={hidden} />
      {/* общий скролл-контейнер для ВСЕХ страниц */}
      <main
        className="flex-1 overflow-y-auto px-4 py-4 pb-24 max-w-[390px] w-full mx-auto"
        onScroll={onScroll}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
