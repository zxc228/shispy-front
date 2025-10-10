const LEVELS = ['error', 'warn', 'info', 'debug']
const _listeners = new Set()
const _buffer = []
const MAX_BUFFER = 200

function getLevel() {
  // default verbose in dev
  return import.meta?.env?.MODE === 'development' ? 'debug' : 'info'
}

function shouldLog(target) {
  const cur = getLevel()
  return LEVELS.indexOf(target) <= LEVELS.indexOf(cur)
}

function mask(value) {
  if (!value) return value
  if (typeof value !== 'string') return value
  if (value.length <= 8) return '***'
  return value.slice(0, 4) + '...' + value.slice(-4)
}

export const logger = {
  error: (...args) => {
    const ok = shouldLog('error')
    if (ok) console.error('[LOG][error]', ...args)
    emit('error', args)
  },
  warn: (...args) => {
    const ok = shouldLog('warn')
    if (ok) console.warn('[LOG][warn]', ...args)
    emit('warn', args)
  },
  info: (...args) => {
    const ok = shouldLog('info')
    if (ok) console.info('[LOG][info]', ...args)
    emit('info', args)
  },
  debug: (...args) => {
    const ok = shouldLog('debug')
    if (ok) console.debug('[LOG][debug]', ...args)
    emit('debug', args)
  },
  mask,
  subscribe(fn) {
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  },
  getBuffer() {
    return [..._buffer]
  },
}

export default logger

function emit(level, args) {
  const entry = { ts: Date.now(), level, args }
  _buffer.push(entry)
  if (_buffer.length > MAX_BUFFER) _buffer.shift()
  _listeners.forEach((fn) => {
    try { fn(entry) } catch { /* noop */ }
  })
}
