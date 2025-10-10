import React, { useEffect, useMemo, useState } from 'react'
import { logger } from '../../shared/logger'

export default function DebugConsole() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState(() => logger.getBuffer())

  useEffect(() => {
    const unsub = logger.subscribe((entry) => {
      setLogs((prev) => [...prev.slice(-199), entry])
    })
    return () => unsub()
  }, [])

  const styleBtn = 'fixed z-[99998] right-2 bottom-2 px-2 py-1 text-[10px] rounded bg-black/70 border border-neutral-700 text-white/80'
  const styleBox = 'fixed z-[99999] left-2 right-2 bottom-10 max-h-[45vh] overflow-auto p-2 rounded bg-black/85 border border-neutral-700 text-white text-[10px] font-mono whitespace-pre-wrap break-words'

  const lines = useMemo(() => logs.map((e, i) => {
    const time = new Date(e.ts).toLocaleTimeString()
    const level = e.level.toUpperCase().padEnd(5)
    const text = e.args.map(formatArg).join(' ')
    return `${time} [${level}] ${text}`
  }), [logs])

  return (
    <>
      <button className={styleBtn} onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide logs' : 'Show logs'}
      </button>
      {open && (
        <div className={styleBox}>
          {lines.length === 0 ? 'No logs yet' : lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </>
  )
}

function formatArg(a) {
  try {
    if (typeof a === 'string') return a
    return JSON.stringify(a)
  } catch {
    return String(a)
  }
}
