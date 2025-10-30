const LEVELS = ['error', 'warn', 'info', 'debug']
const _listeners = new Set()
const _buffer = []
const MAX_BUFFER = 200
const MAX_STRING_LENGTH = 500 // Максимальная длина строки в логах (увеличено для отладки)
const MAX_OBJECT_DEPTH = 5 // Максимальная глубина вложенности объектов (увеличено для отладки)

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

/**
 * Сокращает длинные значения в объектах для читаемости логов
 * @param {*} value - значение для обработки
 * @param {number} depth - текущая глубина рекурсии
 * @param {WeakSet} seen - набор уже обработанных объектов (для защиты от циклических ссылок)
 * @returns {*} обработанное значение
 */
function truncateValue(value, depth = 0, seen = new WeakSet()) {
  // Превышена максимальная глубина
  if (depth > MAX_OBJECT_DEPTH) {
    return '[Deep Object...]'
  }

  // null или undefined
  if (value == null) {
    return value
  }

  // Строки - обрезаем длинные
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      return value.slice(0, MAX_STRING_LENGTH) + `... [${value.length} chars total]`
    }
    return value
  }

  // Примитивы
  if (typeof value !== 'object') {
    return value
  }

  // Защита от циклических ссылок
  if (seen.has(value)) {
    return '[Circular Reference]'
  }
  seen.add(value)

  // Массивы
  if (Array.isArray(value)) {
    if (value.length === 0) return value
    if (value.length > 5) {
      return [
        ...value.slice(0, 3).map(v => truncateValue(v, depth + 1, seen)),
        `... [${value.length - 3} more items]`
      ]
    }
    return value.map(v => truncateValue(v, depth + 1, seen))
  }

  // Объекты - безопасное извлечение ключей (игнорируем геттеры с ошибками)
  let entries
  try {
    entries = Object.entries(value)
  } catch (e) {
    return '[Object: cannot enumerate]'
  }
  
  if (entries.length === 0) return value
  
  const truncated = {}
  let count = 0
  const maxKeys = 10
  
  for (const [key, val] of entries) {
    if (count >= maxKeys) {
      truncated['...'] = `[${entries.length - maxKeys} more keys]`
      break
    }
    
    // Безопасное чтение значения (может быть геттером с ошибкой)
    try {
      truncated[key] = truncateValue(val, depth + 1, seen)
    } catch (e) {
      truncated[key] = '[Error reading value]'
    }
    count++
  }
  
  return truncated
}

/**
 * Обрабатывает аргументы логирования, сокращая длинные значения
 */
function processLogArgs(args) {
  return args.map(arg => truncateValue(arg))
}

export const logger = {
  error: (...args) => {
    const ok = shouldLog('error')
    const processed = processLogArgs(args)
    if (ok) console.error('[LOG][error]', ...processed)
    emit('error', processed)
  },
  warn: (...args) => {
    const ok = shouldLog('warn')
    const processed = processLogArgs(args)
    if (ok) console.warn('[LOG][warn]', ...processed)
    emit('warn', processed)
  },
  info: (...args) => {
    const ok = shouldLog('info')
    const processed = processLogArgs(args)
    if (ok) console.info('[LOG][info]', ...processed)
    emit('info', processed)
  },
  debug: (...args) => {
    const ok = shouldLog('debug')
    const processed = processLogArgs(args)
    if (ok) console.debug('[LOG][debug]', ...processed)
    emit('debug', processed)
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
