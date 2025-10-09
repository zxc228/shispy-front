import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Header from './Header'
import BottomNav from './BottomNav'

export default function AppLayout() {
  const location = useLocation()
  const scrollRef = useRef(null)
  // keep scrollTop per route path
  const positionsRef = useRef(new Map())
  const prevPathRef = useRef(location.pathname)

  // On route change: save previous scroll, restore next (or reset to top if no saved)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const prevPath = prevPathRef.current
    positionsRef.current.set(prevPath, el.scrollTop)

    const nextPath = location.pathname
    const nextTop = positionsRef.current.get(nextPath) ?? 0
    // restore or reset
    el.scrollTop = nextTop

    prevPathRef.current = nextPath
  }, [location.pathname])

  return (
    <div className="h-[var(--tg-vh,100dvh)] bg-black text-white flex flex-col">
      <Header />
      {/* общий скролл-контейнер для ВСЕХ страниц */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-24 max-w-[390px] w-full mx-auto scrollbar-invisible scrollbar-stable [overscroll-behavior:contain] [-webkit-overflow-scrolling:touch]"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
