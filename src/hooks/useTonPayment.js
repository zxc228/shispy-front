import { useState, useCallback } from 'react'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { createDeposit, checkDeposit } from '../shared/api/tonconnect.api'
import { logger } from '../shared/logger'

/**
 * Hook for TON payments (deposit/check)
 * 
 * Usage:
 * const { requestDeposit, status, loading } = useTonPayment()
 * 
 * await requestDeposit({ action: 'game', amount: 1 })
 */
export function useTonPayment() {
  const [tonConnectUI] = useTonConnectUI()
  const userAddress = useTonAddress()
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  /**
   * Request deposit transaction
   * @param {object} params - { action: 'game' | 'gift', amount: number }
   * @returns {Promise<string>} - Deposit ID for tracking
   */
  const requestDeposit = useCallback(async (params) => {
    const { action, amount } = params
    
    if (!userAddress) {
      throw new Error('Wallet not connected')
    }

    setLoading(true)
    setStatus('Requesting transaction from backend...')

    try {
      // 1. Get transaction from backend
      logger.info('useTonPayment: requesting deposit', { action, amount })
      const tx = await createDeposit({ action, amount })
      
      if (!tx || !tx.id) {
        throw new Error('Invalid transaction response')
      }

      logger.info('useTonPayment: got transaction', { id: tx.id })
      
      setStatus('Confirm payment in wallet...')

      // 2. Send transaction to wallet
      await tonConnectUI.sendTransaction(tx)

      logger.info('useTonPayment: transaction sent', { id: tx.id })
      setStatus('Transaction sent, waiting for confirmation...')

      // Return deposit ID for polling
      return tx.id
    } catch (e) {
      logger.error('useTonPayment: deposit failed', e)
      setStatus(`Error: ${e.message || e}`)
      throw e
    } finally {
      setLoading(false)
    }
  }, [userAddress, tonConnectUI])

  /**
   * Check deposit status with polling
   * @param {object} params - { id: string, action: 'game' | 'gift', maxAttempts?: number, intervalMs?: number }
   * @returns {Promise<boolean>} - true if confirmed, false if timeout
   */
  const pollDepositStatus = useCallback(async (params) => {
    const { id, action, maxAttempts = 12, intervalMs = 10000 } = params
    
    setLoading(true)
    setStatus('Checking payment status...')

    try {
      for (let i = 0; i < maxAttempts; i++) {
        logger.info('useTonPayment: checking deposit', { id, action, attempt: i + 1 })
        
        const result = await checkDeposit({ id, action })
        
        // Backend returns string - check if it indicates success
        // Adjust this based on actual backend response
        if (result && (result.includes('success') || result.includes('confirmed') || result.includes('ok'))) {
          logger.info('useTonPayment: deposit confirmed', { id, result })
          setStatus('Payment confirmed!')
          setLoading(false)
          return true
        }

        // Wait before next check
        if (i < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, intervalMs))
        }
      }

      // Timeout
      logger.warn('useTonPayment: deposit check timeout', { id })
      setStatus('Payment check timeout')
      setLoading(false)
      return false
    } catch (e) {
      logger.error('useTonPayment: check failed', e)
      setStatus(`Error checking payment: ${e.message || e}`)
      setLoading(false)
      throw e
    }
  }, [])

  return {
    requestDeposit,
    pollDepositStatus,
    status,
    loading,
    hasWallet: !!userAddress,
  }
}

export default useTonPayment
