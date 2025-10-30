import { useEffect, useRef } from 'react'
import { useIsConnectionRestored, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { getTonConnectPayload, verifyTonConnectProof } from '../../shared/api/tonconnect.api'
import { setWallet as apiSetWallet } from '../../shared/api/wallet.api'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'
import { useBalance } from '../../providers/BalanceProvider'

/**
 * TonConnectBridge
 * - Before connect: requests payload from backend and sets it via setConnectRequestParameters
 * - After connect: verifies proof with backend and stores wallet address ONLY if verified
 * - On disconnect: clears wallet and refreshes balance
 * - Handles payload expiration and auto-reset
 */
export default function TonConnectBridge() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const restored = useIsConnectionRestored()
  const { withLoading } = useLoading()
  const { refresh: refreshBalance } = useBalance()
  const preparedRef = useRef(false)
  const payloadRef = useRef(null)
  const expireTimeoutRef = useRef(null)

  // Prepare payload when no wallet connected (once or after expiration)
  useEffect(() => {
    let cancelled = false
    async function prepare() {
      if (!restored) return
      if (wallet) return
      if (preparedRef.current) return
      try {
        preparedRef.current = true
        tonConnectUI.setConnectRequestParameters({ state: 'loading' })
        const res = await withLoading(() => getTonConnectPayload())
        const payload = res?.payload
        const expireAt = res?.expireAt
        
        if (cancelled) return
        
        if (payload) {
          payloadRef.current = { payload, expireAt }
          tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: payload } })
          
          // Setup expiration timer if expireAt is provided
          if (expireAt) {
            const now = Date.now()
            const expiresIn = expireAt * 1000 - now
            if (expiresIn > 0) {
              if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current)
              expireTimeoutRef.current = setTimeout(() => {
                logger.info('TonConnectBridge: payload expired, resetting')
                tonConnectUI.setConnectRequestParameters(null)
                payloadRef.current = null
                preparedRef.current = false
                // Re-prepare new payload
                prepare()
              }, expiresIn)
            }
          }
        } else {
          tonConnectUI.setConnectRequestParameters(null)
        }
      } catch (e) {
        logger.warn('TonConnectBridge: payload fetch failed', e)
        tonConnectUI.setConnectRequestParameters(null)
        preparedRef.current = false
      }
    }
    prepare()
    return () => {
      cancelled = true
      if (expireTimeoutRef.current) {
        clearTimeout(expireTimeoutRef.current)
        expireTimeoutRef.current = null
      }
    }
  }, [restored, wallet, tonConnectUI, withLoading])

  // On connect -> verify proof and save wallet ONLY if verified
  // On disconnect -> clear wallet and refresh balance
  useEffect(() => {
    const off = tonConnectUI.onStatusChange(async (w) => {
      try {
        if (!w) {
          // Disconnected - refresh balance
          logger.info('TonConnectBridge: wallet disconnected')
          await refreshBalance(true)
          return
        }

        const address = w.account?.address
        const proof = w.connectItems?.tonProof && 'proof' in w.connectItems.tonProof
          ? w.connectItems.tonProof.proof
          : null

        if (proof && address) {
          logger.debug('TonConnectBridge: verifying proof for', address)
          const res = await verifyTonConnectProof(address, proof)
          logger.debug('TonConnectBridge: verify result', res)

          if (res?.verified === true) {
            // Proof verified successfully - save wallet address
            logger.info('TonConnectBridge: proof verified, saving wallet')
            await apiSetWallet(address)
            await refreshBalance(true)
          } else {
            // Verification failed - disconnect wallet
            const reason = res?.reason || 'Proof verification failed'
            logger.warn('TonConnectBridge: proof verification failed:', reason)
            
            // Show error to user via Telegram WebApp if available
            if (window.Telegram?.WebApp?.showAlert) {
              window.Telegram.WebApp.showAlert(`Wallet verification failed: ${reason}`)
            }
            
            // Disconnect the wallet
            await tonConnectUI.disconnect()
          }
        } else if (address && !proof) {
          // No proof provided - disconnect
          logger.warn('TonConnectBridge: no proof provided, disconnecting')
          if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert('Wallet connection requires proof verification')
          }
          await tonConnectUI.disconnect()
        }
      } catch (e) {
        logger.error('TonConnectBridge: status handler error', e)
        // On error, also disconnect
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Connection error. Please try again.')
        }
        await tonConnectUI.disconnect()
      }
    })
    return () => off()
  }, [tonConnectUI, refreshBalance])

  return null
}
