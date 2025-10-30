import { useEffect, useRef } from 'react'
import { useIsConnectionRestored, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { initTonConnectSession, verifyTonConnectSignature } from '../../shared/api/tonconnect.api'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'
import { useBalance } from '../../providers/BalanceProvider'
import { getToken } from '../../shared/api/client'

/**
 * TonConnectBridge
 * - Before connect: requests nonce from backend and sets it via setConnectRequestParameters
 * - After connect: verifies signature with backend using publicKey, signature, and nonce
 * - On disconnect: refreshes balance
 * - Requires Telegram auth (token) before requesting nonce
 */
export default function TonConnectBridge() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const restored = useIsConnectionRestored()
  const { withLoading } = useLoading()
  const { refresh: refreshBalance } = useBalance()
  const preparedRef = useRef(false)
  const sessionDataRef = useRef(null)

  // Prepare nonce when no wallet connected
  // IMPORTANT: Only after Telegram auth (token present)
  useEffect(() => {
    let cancelled = false
    async function prepare() {
      if (!restored) return
      if (wallet) return
      if (preparedRef.current) return
      
      // Wait for Telegram auth token before requesting nonce
      const token = getToken()
      if (!token) {
        logger.info('TonConnectBridge: waiting for Telegram auth before requesting nonce')
        return
      }
      try {
        preparedRef.current = true
        tonConnectUI.setConnectRequestParameters({ state: 'loading' })
        
        // Get new session ID and nonce from backend
        const sessionData = await withLoading(() => initTonConnectSession())
        
        if (cancelled) return
        
        if (sessionData?.nonce) {
          sessionDataRef.current = sessionData
          // Set nonce as tonProof payload
          tonConnectUI.setConnectRequestParameters({ 
            state: 'ready', 
            value: { tonProof: sessionData.nonce } 
          })
          logger.info('TonConnectBridge: nonce prepared', { sessionId: sessionData.sessionId })
        } else {
          tonConnectUI.setConnectRequestParameters(null)
          preparedRef.current = false
        }
      } catch (e) {
        logger.warn('TonConnectBridge: nonce fetch failed', e)
        tonConnectUI.setConnectRequestParameters(null)
        preparedRef.current = false
      }
    }
    prepare()
    
    // Check for token periodically (every 1s) until we have it
    const checkTokenInterval = setInterval(() => {
      if (getToken() && !preparedRef.current && !wallet) {
        prepare()
      }
    }, 1000)
    
    return () => {
      cancelled = true
      clearInterval(checkTokenInterval)
    }
  }, [restored, wallet, tonConnectUI, withLoading])

  // On connect -> verify signature with backend
  // On disconnect -> refresh balance
  useEffect(() => {
    const off = tonConnectUI.onStatusChange(async (w) => {
      try {
        if (!w) {
          // Disconnected - refresh balance and reset preparation
          logger.info('TonConnectBridge: wallet disconnected')
          preparedRef.current = false
          sessionDataRef.current = null
          await refreshBalance(true)
          return
        }

        const address = w.account?.address
        const proof = w.connectItems?.tonProof && 'proof' in w.connectItems.tonProof
          ? w.connectItems.tonProof.proof
          : null

        if (proof && address && sessionDataRef.current) {
          logger.info('TonConnectBridge: verifying signature for', address)
          logger.info('TonConnectBridge: proof data', JSON.stringify(proof, null, 2))
          logger.info('TonConnectBridge: wallet account', JSON.stringify(w.account, null, 2))
          logger.info('TonConnectBridge: session data', sessionDataRef.current)
          
          // Extract signature and payload from proof
          const { signature, payload, domain, timestamp } = proof
          
          // Get public key from wallet
          // TON Connect provides publicKey in hex format in account
          const publicKey = w.account?.publicKey
          
          if (!publicKey) {
            logger.warn('TonConnectBridge: no public key in wallet account')
            if (window.Telegram?.WebApp?.showAlert) {
              window.Telegram.WebApp.showAlert('Wallet connection error: missing public key')
            }
            await tonConnectUI.disconnect()
            return
          }
          
          // The nonce from backend is in URL-safe base64 format
          // For TON Connect proof verification, we need to reconstruct the signed message
          // TON Connect signs a message with format: domain + timestamp + payload (nonce)
          // The signature from proof is already in base64 format
          
          logger.info('TonConnectBridge: nonce from session (URL-safe)', sessionDataRef.current.nonce)
          logger.info('TonConnectBridge: payload from proof', payload)
          logger.info('TonConnectBridge: signature from proof', signature)
          logger.info('TonConnectBridge: publicKey from account', publicKey)
          logger.info('TonConnectBridge: domain', domain)
          logger.info('TonConnectBridge: timestamp', timestamp)
          
          // Prepare verification data - send all proof data to backend for verification
          const verifyData = {
            publicKey: publicKey,
            address: address,
            signature: signature,
            payload: payload, // Send payload as-is from TON Connect proof (URL-safe base64)
            domain: domain.value,
            timestamp: timestamp,
            session: sessionDataRef.current.sessionId,
          }
          
          logger.info('TonConnectBridge: sending verification', JSON.stringify(verifyData, null, 2))
          
          let res
          try {
            res = await verifyTonConnectSignature(verifyData)
            logger.info('TonConnectBridge: verify result', JSON.stringify(res, null, 2))
          } catch (error) {
            logger.error('TonConnectBridge: verify API call failed', error)
            logger.error('TonConnectBridge: error details', JSON.stringify(error, null, 2))
            
            if (window.Telegram?.WebApp?.showAlert) {
              window.Telegram.WebApp.showAlert(`Connection error: ${error.message || 'Unknown error'}`)
            }
            
            sessionDataRef.current = null
            await tonConnectUI.disconnect()
            return
          }

          if (res?.ok === true) {
            // Signature verified successfully - wallet saved on backend
            logger.info('TonConnectBridge: signature verified successfully', { wallet: res.wallet })
            sessionDataRef.current = null // Clear session data
            await refreshBalance(true)
          } else {
            // Verification failed - disconnect wallet
            const error = res?.error || 'Signature verification failed'
            logger.warn('TonConnectBridge: signature verification failed:', error)
            
            // Show error to user via Telegram WebApp if available
            if (window.Telegram?.WebApp?.showAlert) {
              window.Telegram.WebApp.showAlert(`Wallet verification failed: ${error}`)
            }
            
            // Disconnect the wallet
            sessionDataRef.current = null
            await tonConnectUI.disconnect()
          }
        } else if (address && !proof) {
          // No proof provided - disconnect
          logger.warn('TonConnectBridge: no proof provided, disconnecting')
          if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert('Wallet connection requires signature verification')
          }
          await tonConnectUI.disconnect()
        } else if (!sessionDataRef.current) {
          // No session data (shouldn't happen normally)
          logger.warn('TonConnectBridge: no session data available')
          if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert('Connection error: session expired')
          }
          await tonConnectUI.disconnect()
        }
      } catch (e) {
        logger.error('TonConnectBridge: status handler error', e)
        // On error, also disconnect
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Connection error. Please try again.')
        }
        sessionDataRef.current = null
        await tonConnectUI.disconnect()
      }
    })
    return () => off()
  }, [tonConnectUI, refreshBalance])

  return null
}
