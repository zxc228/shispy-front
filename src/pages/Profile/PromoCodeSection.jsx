import React, { useEffect, useMemo, useRef, useState } from 'react'

/**
 * PromoCodeSection
 * - Idle/Typing/Loading/Success/Error states
 * - Uppercase, 4–20 alphanumeric validation
 * - Uses native mobile keyboard (no custom keyboard)
 * - Calls onApplied({ code, reward }) on success
 */
export default function PromoCodeSection({
  className = '',
  onApplied,
  validateCode,
}) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle') // idle | typing | loading | success | error
  const [message, setMessage] = useState('')
  const [reward, setReward] = useState(0)

  const inputRef = useRef(null)

  const isValid = useMemo(() => /^[A-Z0-9]{4,20}$/.test(code), [code])

  useEffect(() => {
    if (status === 'typing' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [status])

  const handleFocus = () => {
    setStatus((prev) => (prev === 'idle' ? 'typing' : prev))
  }

  const handleBlur = () => {
    // If the input is empty after blur, go back to idle; otherwise keep typing state
    setStatus((s) => (!code ? 'idle' : s))
  }

  const onChange = (e) => {
    const v = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
    setCode(v)
    if (status === 'idle') setStatus('typing')
  }

  const handleKeyClick = (ch) => {
    if (ch === 'BACK') {
      setCode((c) => c.slice(0, -1))
      return
    }
    if (ch === 'SPACE') {
      // spaces not allowed by validation; ignore
      return
    }
    setCode((c) => (c + ch).slice(0, 20))
  }

  const handleActivate = async () => {
    if (!isValid || status === 'loading') return
    setStatus('loading')
    setMessage('')

    try {
      const doValidate = validateCode || mockValidate
      const res = await doValidate(code)
      if (res?.ok) {
        const rw = Number(res.reward ?? 0)
        setReward(rw)
        setStatus('success')
        setMessage(res.message || 'Promo applied!')
        onApplied?.({ code, reward: rw })
      } else {
        setStatus('error')
        setMessage(res?.message || 'Invalid promo code')
      }
    } catch (err) {
      setStatus('error')
      setMessage('Something went wrong. Try again')
    }
  }

  const reset = () => {
    setStatus('idle')
    setMessage('')
    setReward(0)
    setCode('')
  }

  return (
    <section className={`w-full px-2.5 ${className}`}>
      <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-offset-[-1px] outline-neutral-700 flex flex-col gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="text-neutral-50 text-base font-semibold font-['SF_Pro_Display']">Promo code</div>
          <div className="text-xs font-normal font-['SF_Pro_Display']">
            <span className="text-orange-400">Follow the</span>
            <span className="text-neutral-700"> </span>
            <span className="text-orange-400">telegram channel</span>
            <span className="text-neutral-700"> and get bonuses</span>
          </div>
        </div>

        {/* Input + Activate */}
        <div className="w-full flex items-center gap-3">
          <div className="h-12 px-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-50 flex items-center gap-2.5 w-full">
            <input
              ref={inputRef}
              type="text"
              inputMode="latin"
              value={code}
              onChange={onChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="ENTER CODE"
              className={`w-full bg-transparent outline-none placeholder:text-neutral-50/25 text-neutral-50/90 text-base font-semibold font-['SF_Pro_Display'] tracking-[0.08em] uppercase ${status === 'loading' ? 'opacity-50' : ''}`}
              disabled={status === 'loading' || status === 'success'}
              aria-label="Promo code"
            />
          </div>

          {status !== 'success' ? (
            <button
              onClick={handleActivate}
              disabled={!isValid || status === 'loading'}
              className={`flex-1 h-12 pl-4 pr-3 py-3 rounded-xl shadow-[inset_0_-1px_0_0_rgba(206,196,189,1)] inline-flex items-center justify-center gap-2 transition-opacity ${
                !isValid || status === 'loading' ? 'opacity-50 cursor-not-allowed bg-neutral-300' : 'bg-gradient-to-l from-white to-gray-200'
              }`}
              aria-label="Activate promo"
            >
              {status === 'loading' ? (
                <Spinner size={18} />
              ) : (
                <span className="text-neutral-800 text-base font-semibold font-['SF_Pro_Display'] [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">
                  Activate
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={reset}
              className="flex-1 h-12 pl-4 pr-3 py-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-700 inline-flex items-center justify-center gap-1"
              aria-label="Back"
            >
              <span className="text-neutral-100 text-base font-semibold font-['SF_Pro_Display']">Back</span>
            </button>
          )}
        </div>

        {/* Feedback row */}
        <div className="min-h-6">
          {status === 'idle' && (
            <div className="text-neutral-700 text-xs font-normal font-['SF_Pro_Display']">Reward: 0.00 TON</div>
          )}
          {status === 'typing' && (
            <div className={`text-xs font-normal font-['SF_Pro_Display'] ${isValid ? 'text-green-500' : 'text-neutral-700'}`}>
              {isValid ? 'Code looks good' : 'Use 4–20 characters A–Z 0–9'}
            </div>
          )}
          {status === 'error' && (
            <div className="text-red-500 text-xs font-normal font-['SF_Pro_Display']">{message || 'Invalid promo code'}</div>
          )}
          {status === 'success' && (
            <div className="inline-flex items-center gap-1">
              <span className="text-green-500 text-sm font-semibold font-['SF_Pro_Display']">+{reward.toFixed(2)}</span>
              <TonIcon size={14} />
            </div>
          )}
        </div>

        {/* Result card when success */}
        {status === 'success' && (
          <div className="w-full p-3 bg-neutral-900 rounded-xl outline outline-1 outline-offset-[-1px] outline-green-600 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-neutral-50 text-sm font-semibold font-['SF_Pro_Display']">Promo applied</div>
              <div className="text-neutral-400 text-xs font-normal font-['SF_Pro_Display']">Code {code}</div>
            </div>
            <div className="inline-flex items-center gap-1">
              <span className="text-green-500 text-sm font-semibold font-['SF_Pro_Display']">+{reward.toFixed(2)}</span>
              <TonIcon size={14} />
            </div>
          </div>
        )}

        {/* Native keyboard is used on mobile devices (no custom keyboard) */}
      </div>
    </section>
  )
}

function Spinner({ size = 16 }) {
  const s = `${size}px`
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-neutral-800 border-t-neutral-400"
      style={{ width: s, height: s }}
      aria-label="loading"
    />
  )
}

function TonIcon({ size = 16 }) {
  const s = `${size}px`
  const dot = Math.max(2, Math.floor(size / 6))
  const dot2 = Math.max(1, Math.floor(size / 10))
  return (
    <span className="relative inline-block" style={{ width: s, height: s }}>
      <span className="absolute bg-sky-500 rounded" style={{ width: s, height: s }} />
      <span className="absolute bg-white rounded-full" style={{ width: `${dot}px`, height: `${dot}px`, left: `${dot}px`, top: `${size - dot - 2}px` }} />
      <span className="absolute bg-white rounded-full" style={{ width: `${dot2}px`, height: `${dot2}px`, left: `${dot + 1}px`, top: `${size - dot2 - 1}px` }} />
    </span>
  )
}

async function mockValidate(code) {
  // Simulate network delay 0.9–1.2s
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 300))
  const ok = code === 'GIFTSHIP' || code.startsWith('SHIP') || code.endsWith('2025')
  if (ok) return { ok: true, reward: 1.0, message: 'Promo applied!' }
  return { ok: false, message: 'Code is invalid or expired' }
}

