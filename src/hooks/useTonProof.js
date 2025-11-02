import { useEffect, useState } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { initTonConnectSession, verifyTonConnectProof } from '../shared/api/tonconnect.api'
import { logger } from '../shared/logger'

/**
 * Hook для автоматической верификации TonConnect wallet с proof
 * 
 * @returns {Object} { status, error }
 * - status: строка с текущим статусом процесса
 * - error: ошибка если есть
 */
export function useTonProof() {
  const [tonConnectUI] = useTonConnectUI()
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const [currentSession, setCurrentSession] = useState(null)

  // Запрос nonce и установка tonProof параметров при монтировании
  useEffect(() => {
    if (!tonConnectUI) return

    async function setupTonProof() {
      try {
        setStatus('Получаю nonce...')
        const { session, nonce } = await initTonConnectSession()
        setCurrentSession(session)

        // Установить tonProof параметры перед подключением
        tonConnectUI.setConnectRequestParameters({
          state: 'ready',
          value: { tonProof: nonce }
        })

        setStatus('Подключите кошелёк для подтверждения...')
      } catch (e) {
        const errorMsg = e?.message || String(e)
        setStatus(`Ошибка: ${errorMsg}`)
        setError(e)
        logger.error('setupTonProof error:', e)
        setCurrentSession(null)
      }
    }

    setupTonProof()
  }, [tonConnectUI])

  // Автоматическая верификация при подключении кошелька
  useEffect(() => {
    if (!tonConnectUI) return

    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) {
        setStatus('')
        setError(null)
        return
      }

      // Проверяем наличие proof
      const proof = wallet.connectItems?.tonProof?.proof
      if (!proof) {
        setStatus('Кошелёк подключён без подтверждения')
        return
      }

      // Если нет сохранённой сессии, значит это не наше подключение
      if (!currentSession) {
        logger.warn('No session found for proof verification')
        return
      }

      // Верификация proof на бэкенде
      try {
        setStatus('Отправляю подтверждение на сервер...')
        
        const account = wallet.account
        if (!account) throw new Error('Missing account data')

        const domainStr = typeof proof.domain === 'string' 
          ? proof.domain 
          : proof.domain?.value

        const verifyData = await verifyTonConnectProof({
          session: currentSession,
          publicKey: account.publicKey,
          address: account.address,
          proof: {
            signature: proof.signature,
            payload: proof.payload,
            domain: domainStr,
            timestamp: Number(proof.timestamp)
          }
        })

        if (verifyData?.status) {
          setStatus('✓ Кошелёк подтверждён')
          setError(null)
          setCurrentSession(null) // Очистить сессию после успеха
        } else {
          throw new Error(verifyData?.error || 'Verification failed')
        }
      } catch (e) {
        const errorMsg = e?.message || String(e)
        setStatus(`Ошибка: ${errorMsg}`)
        setError(e)
        logger.error('Wallet verification error:', e)
      }
    })

    return () => unsubscribe()
  }, [tonConnectUI, currentSession])

  return { status, error }
}
