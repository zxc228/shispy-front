import { useState } from 'react'
import TonSvg from '../../components/icons/TonIcon.svg'

export default function AddPage() {
  const [amount, setAmount] = useState('')

  const onChange = (e) => {
    // Allow digits and one dot/comma, max 2 decimals
    let v = (e.target.value || '').replace(',', '.').toUpperCase()
    // Remove invalid chars
    v = v.replace(/[^0-9.]/g, '')
    // Keep only first dot
    const firstDot = v.indexOf('.')
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '')
    }
    // Limit to 2 decimals
    if (firstDot !== -1) {
      const [i, d] = v.split('.')
      v = d !== undefined ? `${i}.${d.slice(0, 2)}` : i
    }
    setAmount(v)
  }

  const valid = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0

  return (
    <div className="mx-auto max-w-[390px] px-2.5 py-4 space-y-3">
      <div className="w-full p-1 rounded-xl">
        <div className="w-full h-12 p-3 bg-black rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-50/25 inline-flex justify-start items-center gap-2.5">
          {/* TON icon */}
          <img src={TonSvg} alt="TON" className="w-4 h-4 object-contain" />
          {/* Amount input (styled like the design text) */}
          <input
            value={amount}
            onChange={onChange}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Amount"
            className="flex-1 bg-transparent outline-none text-neutral-50 text-base font-semibold font-sans [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)] placeholder:text-neutral-50/30"
          />
        </div>
      </div>

      {/* CTA button: gray when disabled, orange when valid */}
      <button
        type="button"
        disabled={!valid}
        className={`w-full h-12 px-4 py-3 rounded-xl shadow-[inset_0_-1px_0_0_rgba(206,196,189,1)] inline-flex items-center justify-center gap-1 transition-opacity ${
          valid ? 'bg-gradient-to-b from-orange-400 to-amber-700' : 'bg-neutral-300 text-neutral-700 cursor-not-allowed'
        }`}
        aria-label="Top up your balance"
      >
        <span className={`${valid ? 'text-white' : 'text-neutral-800'} text-base font-semibold font-sans ${valid ? '[text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]' : ''}`}>
          Top up your balance
        </span>
      </button>
    </div>
  )
}


