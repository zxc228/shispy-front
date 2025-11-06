import { useState } from 'react'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { TonConnectButton } from '@tonconnect/ui-react'
import TonSvg from '../../components/icons/TonIcon.svg'
import { createDeposit } from '../../shared/api/tonconnect.api'
import { logger } from '../../shared/logger'

export default function AddPage() {
  const [amount, setAmount] = useState('')
  const [tonConnectUI] = useTonConnectUI()
  const userAddress = useTonAddress()

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

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const valid = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0

  const onTopUp = async () => {
    if (!valid || busy) return
    
    if (!userAddress) {
      setStatus('❌ Подключите кошелёк')
      setTimeout(() => setStatus(''), 2500)
      return
    }

    try {
      setBusy(true)
      setStatus('📡 Создаём транзакцию...')

      const tonAmount = Number(amount)
      
      // 1. Получаем готовую транзакцию от бэка (отправляем дробное число TON, бэкенд сам конвертирует)
      logger.info('AddPage: Creating deposit request', { tonAmount })
      const tx = await createDeposit('game', tonAmount)
      logger.info('AddPage: Received transaction', tx)

      // 2. Просто передаём amount как строку (бэкенд вернёт правильное значение)
      const normalizedMessages = tx.messages.map(msg => ({
        ...msg,
        amount: String(msg.amount)
      }))

      // 3. Отправляем транзакцию в кошелёк и ждём подтверждения
      setStatus('💳 Подтвердите платёж в кошельке...')
      const txResult = await tonConnectUI.sendTransaction({
        validUntil: tx.validUntil,
        messages: normalizedMessages
      })
      
      logger.info('AddPage: Transaction sent from wallet', { txResult })
      
      // Если транзакция подтверждена кошельком
      if (txResult?.boc) {
        setStatus('✅ Транзакция отправлена в блокчейн!')
        // Очищаем поле суммы после успешной отправки
        setAmount('')
      } else {
        throw new Error('Транзакция не была подтверждена кошельком')
      }
    } catch (e) {
      logger.error('AddPage: Deposit error', e)
      // Проверяем, не отменил ли пользователь транзакцию
      if (e?.message?.includes('cancel') || e?.message?.includes('reject')) {
        setStatus('❌ Транзакция отменена')
      } else {
        setStatus(`❌ Ошибка: ${e.message || e}`)
      }
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 3500)
    }
  }

  return (
    <div className="mx-auto max-w-[390px] px-2.5 py-4 space-y-3">
      {/* TON Connect Button */}
      {!userAddress && (
        <div className="w-full p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60">
          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <div className="text-neutral-50 text-base font-semibold font-sans">Подключите кошелёк</div>
              <div className="text-neutral-400 text-xs mt-1">Для пополнения баланса подключите TON кошелёк</div>
            </div>
            <TonConnectButton className="mx-auto" />
          </div>
        </div>
      )}

      {/* Wallet Address Display */}
      {userAddress && (
        <div className="w-full p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-neutral-50 text-sm font-semibold font-sans">Кошелёк подключён</div>
              <div className="text-neutral-400 text-xs font-mono">
                {userAddress.slice(0, 8)}...{userAddress.slice(-6)}
              </div>
            </div>
            <TonConnectButton className="scale-90" />
          </div>
        </div>
      )}

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
            disabled={!userAddress}
            className="flex-1 bg-transparent outline-none text-neutral-50 text-base font-semibold font-sans [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)] placeholder:text-neutral-50/30 disabled:opacity-50"
          />
        </div>
      </div>

      {/* CTA button: gray when disabled, orange when valid */}
      <button
        type="button"
        disabled={!valid || busy || !userAddress}
        className={`w-full h-12 px-4 py-3 rounded-xl shadow-[inset_0_-1px_0_0_rgba(206,196,189,1)] inline-flex items-center justify-center gap-1 transition-opacity ${
          valid && !busy && userAddress ? 'bg-gradient-to-b from-orange-400 to-amber-700' : 'bg-neutral-300 text-neutral-700 cursor-not-allowed'
        }`}
        aria-label="Top up your balance"
        onClick={onTopUp}
      >
        <span className={`${valid && !busy && userAddress ? 'text-white' : 'text-neutral-800'} text-base font-semibold font-sans ${valid && !busy && userAddress ? '[text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]' : ''}`}>
          {busy ? 'Обработка…' : 'Пополнить баланс'}
        </span>
      </button>

      {status && (
        <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/40">
          <div className="text-white/80 text-xs text-center whitespace-pre-wrap break-words">
            {status}
          </div>
        </div>
      )}
    </div>
  )
}


