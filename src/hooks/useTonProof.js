import { useEffect, useState } from 'react'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { initTonConnectSession, verifyTonConnectProof } from '../shared/api/tonconnect.api'
import { logger } from '../shared/logger'

const VERIFIED_WALLETS_KEY = 'ton_verified_wallets'

/**
 * Hook для автоматической верификации TonConnect wallet с proof
 * 
 * @returns {Object} { status, error }
 * - status: строка с текущим статусом процесса
 * - error: ошибка если есть
 */
export function useTonProof() {
  const [tonConnectUI] = useTonConnectUI()
  const userAddress = useTonAddress()
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const [currentSession, setCurrentSession] = useState(null)

  // Проверка, был ли кошелек уже верифицирован
  const isWalletVerified = (address) => {
    if (!address) return false
    try {
      const verified = JSON.parse(localStorage.getItem(VERIFIED_WALLETS_KEY) || '{}')
      return verified[address] === true
    } catch {
      return false
    }
  }

  // Сохранение статуса верификации кошелька
  const markWalletAsVerified = (address) => {
    if (!address) return
    try {
      const verified = JSON.parse(localStorage.getItem(VERIFIED_WALLETS_KEY) || '{}')
      verified[address] = true
      localStorage.setItem(VERIFIED_WALLETS_KEY, JSON.stringify(verified))
    } catch (e) {
      logger.warn('Failed to save wallet verification status:', e)
    }
  }

  // Запрос nonce и установка tonProof параметров при монтировании
  useEffect(() => {
    if (!tonConnectUI) return

    // Если кошелек уже подключен и верифицирован, не запрашиваем новый nonce
    const wallet = tonConnectUI.wallet
    if (wallet && userAddress && isWalletVerified(userAddress)) {
      setStatus('✓ Кошелёк подтверждён')
      return
    }

    async function setupTonProof() {
      try {
        // Если кошелек уже подключен, но не верифицирован
        if (wallet) {
          setStatus('Кошелёк подключён ранее')
          return
        }

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
  }, [tonConnectUI, userAddress])

  // Автоматическая верификация при подключении кошелька
  useEffect(() => {
    if (!tonConnectUI) return

    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) {
        setStatus('')
        setError(null)
        return
      }

      const walletAddress = wallet.account?.address
      
      // Если кошелек уже верифицирован, не делаем повторную верификацию
      if (walletAddress && isWalletVerified(walletAddress)) {
        setStatus('✓ Кошелёк подтверждён')
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
          markWalletAsVerified(account.address) // Сохранить статус верификации
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
