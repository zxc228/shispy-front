import { Outlet } from 'react-router-dom'

export default function LobbyPage() {
  return (
    <div className="min-h-[812px] w-full max-w-[390px] mx-auto bg-black text-white relative">
      {/* Внутренний контейнер делегируем дочерним страницам */}
      <Outlet />
    </div>
  )
}
