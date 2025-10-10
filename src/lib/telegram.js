export function getTg() {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp || null
}

export function initTelegram() {
  const tg = getTg()
  if (!tg) return null
  try {
    // safe calls; ignore errors outside real Telegram env
    tg.expand?.()
    tg.ready?.()
  } catch {
    // ignore
  }
  return tg
}
