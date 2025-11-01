import { useEffect, useRef, useState } from 'react'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { getApiInstance, getToken } from '../../shared/api/client'
import { logger } from '../../shared/logger'
import { useBalance } from '../../providers/BalanceProvider'

export default function TonConnectBridge() {
  const [tonConnectUI] = useTonConnectUI()
  const userAddress = useTonAddress()
  const { refresh: refreshBalance } = useBalance()
  const [status, setStatus] = useState('')
  const preparingRef = useRef(false)
  const sessionRef = useRef(null)
  const preparedNonceRef = useRef(null)

  async function requestProofAny(tonConnectUI, payload) {
    logger.info('[requestProofAny] Starting', { payload })
    
    if (typeof tonConnectUI.requestProof === 'function') {
      logger.info('[requestProofAny] Trying method 1: requestProof')
      try {
        const res = await tonConnectUI.requestProof({ payload })
        logger.info('[requestProofAny] Method 1 success')
        return { proof: res?.proof, wallet: tonConnectUI.wallet }
      } catch (e) {
        logger.error('[requestProofAny] Method 1 failed', e)
      }
    }
    
    if (tonConnectUI.connector && typeof tonConnectUI.connector.requestProof === 'function') {
      logger.info('[requestProofAny] Trying method 2: connector.requestProof')
      try {
        const res = await tonConnectUI.connector.requestProof({ payload })
        logger.info('[requestProofAny] Method 2 success')
        return { proof: res?.proof, wallet: tonConnectUI.wallet }
      } catch (e) {
        logger.error('[requestProofAny] Method 2 failed', e)
      }
    }
    
    logger.info('[requestProofAny] Using method 3: reconnect')
    const wasConnected = !!tonConnectUI.wallet
    logger.info('[requestProofAny] Was connected:', wasConnected)
    
  // Some wallets expect object shape { tonProof: { payload } }
  tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: { payload } } })
  logger.info('[requestProofAny] Set tonProof parameters', { shape: 'object' })
    
    if (wasConnected) { 
      try { 
        await tonConnectUI.disconnect() 
        logger.info('[requestProofAny] Disconnected')
      } catch (e) {
        logger.error('[requestProofAny] Disconnect error', e)
      }
    }
    
    const result = await new Promise((resolve, reject) => {
      logger.info('[requestProofAny] Setting up listener...')
      
      // Timeout fallback
      const timeout = setTimeout(() => {
        logger.error('[requestProofAny] Timeout after 60s')
        reject(new Error('Connection timeout'))
      }, 60000)
      
      const off = tonConnectUI.onStatusChange((wallet) => {
        logger.info('[requestProofAny] Status changed:', wallet ? 'connected' : 'null')
        if (!wallet) return
        clearTimeout(timeout)
        off()
        const proof = wallet.connectItems?.tonProof?.proof
        logger.info('[requestProofAny] Proof:', proof ? 'present' : 'missing')
        if (proof) resolve({ proof, wallet })
        else reject(new Error('Wallet connected without proof'))
      })
      
      logger.info('[requestProofAny] Opening modal...')
      tonConnectUI.openModal().catch((e) => {
        logger.error('[requestProofAny] openModal error', e)
        clearTimeout(timeout)
        reject(e)
      })
      
      // FALLBACK: Poll wallet every 500ms
      logger.info('[requestProofAny] Starting polling fallback...')
      const pollInterval = setInterval(() => {
        const wallet = tonConnectUI.wallet
        if (wallet) {
          logger.info('[requestProofAny] Polling detected wallet!')
          clearInterval(pollInterval)
          clearTimeout(timeout)
          off()
          const proof = wallet.connectItems?.tonProof?.proof
          logger.info('[requestProofAny] Proof from polling:', proof ? 'present' : 'missing')
          if (proof) resolve({ proof, wallet })
          else reject(new Error('Wallet connected without proof'))
        }
      }, 500)
    })
    
    logger.info('[requestProofAny] Method 3 success')
    return result
  }

  // Prepare connect parameters with tonProof BEFORE user clicks TonConnectButton
  useEffect(() => {
    const token = getToken()
    if (!token) return
    if (userAddress) return // already connected
    if (preparingRef.current) return

    preparingRef.current = true
    ;(async () => {
      try {
        setStatus('Готовлю подключение...')
        // 1) Get session + nonce
        const session = crypto.randomUUID()
        sessionRef.current = session
        const api = getApiInstance()
        const resp = await api.post('/tonconnect/nonce', { session })
        const { nonce } = resp.data || {}
        if (!nonce) throw new Error('Нет nonce от бэкенда')
        preparedNonceRef.current = nonce
        // 2) Configure connect to request proof on first connect
        tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: { payload: nonce } } })
        logger.info('TonConnectBridge: tonProof prepared for first connect')

        // 3) One-time status listener to capture proof at first connect
        const off = tonConnectUI.onStatusChange(async (wallet) => {
          if (!wallet) return
          off()
          try {
            const proof = wallet.connectItems?.tonProof?.proof
            if (!proof) throw new Error('Кошелёк подключился без proof')
            await new Promise(r => setTimeout(r, 0))
            const account = tonConnectUI.wallet?.account
            if (!account) throw new Error('Нет аккаунта после подключения')
            const domainStr = typeof proof.domain === 'string' ? proof.domain : proof.domain?.value
            setStatus('Подтверждаю подпись...')
            const verifyResp = await api.post('/tonconnect/verify', {
              session: sessionRef.current,
              publicKey: account.publicKey,
              address: account.address,
              proof: {
                signature: proof.signature,
                payload: proof.payload,
                domain: domainStr,
                timestamp: proof.timestamp
              }
            })
            const v = verifyResp.data
            if (!v?.status) throw new Error(v?.error || 'Verification failed')
            setStatus('✅ Кошелёк подтверждён')
            await refreshBalance(true)
            setTimeout(() => setStatus(''), 1500)
          } catch (e) {
            logger.error('TonConnectBridge: verify-on-connect failed', e)
            setStatus(`❌ ${e.message || e}`)
          } finally {
            // Clear prepared state regardless of result
            tonConnectUI.setConnectRequestParameters(null)
          }
        })
      } catch (e) {
        logger.error('TonConnectBridge: prepare connect failed', e)
        setStatus(`❌ ${e.message || e}`)
      } finally {
        preparingRef.current = false
      }
    })()
  }, [userAddress, tonConnectUI])

  // Legacy manual signIn (unused in new flow). Kept for fallback and debugging.
  async function signIn() {
    if (!userAddress) {
      setStatus('Please connect wallet first')
      return
    }
    setStatus('Getting nonce...')
    try {
      const session = crypto.randomUUID()
      const apiInstance = getApiInstance()
      const nonceResp = await apiInstance.post('/tonconnect/nonce', { session })
      const nonceData = nonceResp.data
      if (!nonceData.nonce) throw new Error('Nonce malformed')
      const payload = nonceData.nonce
      setStatus('Requesting TON Proof in wallet...')
      const { proof } = await requestProofAny(tonConnectUI, payload)
      await new Promise(r => setTimeout(r, 0))
      const account = tonConnectUI.wallet?.account
      if (!account) throw new Error('No wallet account after proof')
      const domainStr = typeof proof.domain === 'string' ? proof.domain : proof.domain?.value
      logger.info('TonConnectBridge: verifying', { session, address: account.address })
      const verifyResp = await apiInstance.post('/tonconnect/verify', {
        session,
        publicKey: account.publicKey,
        address: account.address,
        proof: {
          signature: proof.signature,
          payload: proof.payload,
          domain: domainStr,
          timestamp: proof.timestamp
        }
      })
      const verifyData = verifyResp.data
      if (verifyData.status) {
        setStatus('✅ Wallet verified!')
        logger.info('TonConnectBridge: ✅ verified', { address: verifyData.address })
        await refreshBalance(true)
        setTimeout(() => setStatus(''), 2000)
      } else {
        throw new Error(verifyData.error || 'Verification failed')
      }
    } catch (e) {
      logger.error('TonConnectBridge: error', e)
      setStatus(`❌ Error: ${e.message || e}`)
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(`Wallet verification failed: ${e.message}`)
      }
      setTimeout(() => {
        tonConnectUI.disconnect()
        setStatus('')
      }, 2000)
    } finally {
      authInProgressRef.current = false
    }
  }

  return null
}
