import React from 'react'

export default function DuplicateConnectionScreen({ onReload }) {
  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-start p-6 overflow-y-auto">
      <div className="max-w-md w-full py-8 flex flex-col items-center">
        {/* Icon */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 blur-2xl bg-red-500/30 animate-pulse" />
          <div className="relative text-[80px] leading-none">⚠️</div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3 text-center">
          Подключение с другого устройства
        </h1>
        
        {/* Description */}
        <p className="text-neutral-300 text-center mb-6 text-sm leading-relaxed">
          Вы подключились к игре с другого устройства. Это устройство было отключено.
        </p>

        {/* Info card */}
        <div className="bg-neutral-900 rounded-2xl p-5 mb-6 w-full border border-neutral-800">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-xl">🔒</span>
            <div>
              <h3 className="text-white font-semibold mb-1 text-sm">
                Безопасность
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Для защиты от мошенничества одновременно можно играть только с одного устройства.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-xl">📱</span>
            <div>
              <h3 className="text-white font-semibold mb-1 text-sm">
                Как продолжить?
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Закройте игру на другом устройстве и нажмите кнопку ниже для переподключения.
              </p>
            </div>
          </div>
        </div>

        {/* Reload button */}
        <button
          onClick={onReload}
          className="w-full h-12 px-6 rounded-xl bg-gradient-to-b from-orange-400 to-amber-700 text-white font-semibold shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)] [text-shadow:_0_1px_25px_rgba(0,0,0,0.25)] active:translate-y-[0.5px] transition-transform"
        >
          Переподключиться
        </button>
      </div>
    </div>
  )
}
