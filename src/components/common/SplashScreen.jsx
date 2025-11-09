import React from 'react'

export default function SplashScreen({ onClose }) {
  const handleChannelClick = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink('https://t.me/shipsy_community')
    } else {
      window.open('https://t.me/shipsy_community', '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-[fadeIn_0.3s_ease-out]">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white hover:bg-neutral-700 active:scale-95 transition-all"
        aria-label="Close"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Pirate Icon with glow */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 blur-2xl bg-orange-400/20 animate-pulse" />
        <div className="relative text-[120px] leading-none animate-[bounce_1s_ease-in-out_infinite]">🏴‍☠️</div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
        Shipsy
      </h1>
      
      {/* Subtitle */}
      <p className="text-neutral-400 text-center px-6 mb-12 max-w-sm">
        Добро пожаловать в игру!
      </p>

      {/* Community Section */}
      <div className="bg-neutral-900 rounded-2xl p-6 mx-6 max-w-md border border-neutral-800">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">👥</span>
          <h2 className="text-xl font-semibold text-white">
            Присоединяйтесь к сообществу
          </h2>
        </div>
        
        <p className="text-neutral-400 text-sm text-center mb-6">
          Чтобы быть в курсе важных обновлений, новостей и розыгрышей призов.
        </p>

        {/* Buttons */}
        <div>
          <button
            onClick={handleChannelClick}
            className="w-full flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 text-white font-semibold shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] transition-transform"
          >
            <span className="text-xl">📢</span>
            <span>Канал</span>
          </button>
        </div>
      </div>
    </div>
  )
}
