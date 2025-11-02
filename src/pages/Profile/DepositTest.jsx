import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { useState } from 'react'
import { createDeposit, checkDeposit } from '../../shared/api/tonconnect.api'
import { logger } from '../../shared/logger'

export default function DepositTest() {
  const [tonConnectUI] = useTonConnectUI()
  const userAddress = useTonAddress()
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function requestDeposit(amount = 1) {
    if (!userAddress) {
      setStatus('❌ Подключи кошелёк')
      return
    }
    
    setLoading(true)
    setStatus('📡 Запрашиваю транзакцию у бэка...')

    try {
      // 1. Получаем готовую транзакцию от бэка
      logger.info('DepositTest: Creating deposit request', { amount })
      const tx = await createDeposit('game', amount)
      logger.info('DepositTest: Received transaction', tx)

      // 2. Преобразуем amount в правильный формат (убираем .0 если есть)
      const normalizedMessages = tx.messages.map(msg => ({
        ...msg,
        amount: String(Math.floor(parseFloat(msg.amount)))
      }))

      // 3. Отправляем транзакцию в кошелёк и ждём подтверждения
      setStatus('💳 Подтверди платеж в кошельке...')
      const txResult = await tonConnectUI.sendTransaction({
        validUntil: tx.validUntil,
        messages: normalizedMessages
      })
      
      logger.info('DepositTest: Transaction sent from wallet', { txResult })
      
      // Если транзакция подтверждена кошельком
      if (txResult?.boc) {
        setStatus('✅ Транзакция отправлена в блокчейн! BOC: ' + txResult.boc.slice(0, 32) + '...')
        // Опционально: можно добавить проверку на бэке
        // await checkDepositStatus(tx.id)
      } else {
        throw new Error('Транзакция не была подтверждена кошельком')
      }
    } catch (e) {
      logger.error('DepositTest: Error', e)
      // Проверяем, не отменил ли пользователь транзакцию
      if (e?.message?.includes('cancel') || e?.message?.includes('reject')) {
        setStatus('❌ Транзакция отменена пользователем')
      } else {
        setStatus(`❌ Ошибка: ${e.message || e}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function checkDepositStatus(depositId) {
    const maxAttempts = 20 // увеличиваем количество попыток
    const delayMs = 5000 // уменьшаем интервал до 5 секунд (транзакция уже отправлена)

    for (let i = 0; i < maxAttempts; i++) {
      try {
        logger.info(`DepositTest: Checking deposit status (attempt ${i + 1}/${maxAttempts})`, { depositId })
        const result = await checkDeposit(depositId, 'game')
        
        if (result && result !== 'pending') {
          setStatus(`✅ Депозит подтверждён в блокчейне: ${result}`)
          logger.info('DepositTest: Deposit confirmed', { result })
          return
        }
        
        setStatus(`⏳ Ждём подтверждения в блокчейне... (${i + 1}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } catch (e) {
        logger.error('DepositTest: Check deposit error', e)
        // Продолжаем попытки даже при ошибке (может быть временная проблема с lite-server)
      }
    }
    
    setStatus('⚠️ Депозит ещё не подтверждён в блокчейне. Это может занять несколько минут. Проверь баланс позже.')
  }

  return (
    <section className="w-full px-2.5">
      <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-neutral-50 text-base font-semibold font-sans">💰 Test Deposit</div>
            <div className="text-neutral-700 text-xs font-normal font-sans">
              Test TON payment via TON Connect
            </div>
          </div>
        </div>

        {userAddress && (
          <div className="text-center text-neutral-400 text-xs font-mono max-w-full truncate">
            {userAddress.slice(0, 8)}...{userAddress.slice(-6)}
          </div>
        )}

        <button
          onClick={() => requestDeposit(1)}
          disabled={!userAddress || loading}
          className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
            userAddress && !loading
              ? 'bg-gradient-to-b from-orange-400 to-amber-700 text-white hover:opacity-90'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}
        >
          {loading ? '⏳ Обработка...' : '💳 Внести 1 TON (тест)'}
        </button>

        {status && (
          <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/40">
            <div className="text-white/80 text-xs whitespace-pre-wrap break-words">
              {status}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
