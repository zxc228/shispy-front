import { getApiInstance } from './client'
import { logger } from '../logger'

// Generate a unique session ID for TON Connect flow
function generateSessionId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Universal helper to request TON Proof from wallet
 * Works across different SDK versions
 * @param {object} tonConnectUI - TonConnectUI instance
 * @param {string} payload - Nonce payload from backend
 * @returns {Promise<{proof: object, wallet: object}>}
 */
export async function requestProofAny(tonConnectUI, payload) {
  logger.info('[requestProofAny] Starting proof request', { payload })
  
  // 1) New API
  if (typeof tonConnectUI.requestProof === 'function') {
    logger.info('[requestProofAny] Using method 1: tonConnectUI.requestProof')
    try {
      const res = await tonConnectUI.requestProof({ payload })
      logger.info('[requestProofAny] Method 1 success', res)
      return { proof: res?.proof, wallet: tonConnectUI.wallet }
    } catch (e) {
      logger.error('[requestProofAny] Method 1 failed', e)
      throw e
    }
  }
  
  // 2) Low-level API
  if (tonConnectUI.connector && typeof tonConnectUI.connector.requestProof === 'function') {
    logger.info('[requestProofAny] Using method 2: connector.requestProof')
    try {
      const res = await tonConnectUI.connector.requestProof({ payload })
      logger.info('[requestProofAny] Method 2 success', res)
      return { proof: res?.proof, wallet: tonConnectUI.wallet }
    } catch (e) {
      logger.error('[requestProofAny] Method 2 failed', e)
      throw e
    }
  }
  
  // 3) Fallback via reconnect + tonProof
  logger.info('[requestProofAny] Using method 3: fallback via reconnect')
  const wasConnected = !!tonConnectUI.wallet
  logger.info('[requestProofAny] Wallet was connected:', wasConnected)
  
  // Set tonProof parameters BEFORE disconnect
  logger.info('[requestProofAny] Setting tonProof parameters...')
  tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: payload } })
  
  if (wasConnected) { 
    logger.info('[requestProofAny] Disconnecting wallet...')
    try { await tonConnectUI.disconnect() } catch (e) {
      logger.error('[requestProofAny] Disconnect error', e)
    }
    // Small delay after disconnect
    await new Promise(r => setTimeout(r, 100))
  }

  const result = await new Promise((resolve, reject) => {
    logger.info('[requestProofAny] Setting up status change listener...')
    
    let off = null
    const timeout = setTimeout(() => {
      logger.error('[requestProofAny] Timeout after 60s')
      if (off) off()
      reject(new Error('Connection timeout'))
    }, 60000)
    
    off = tonConnectUI.onStatusChange((wallet) => {
      logger.info('[requestProofAny] Status changed:', wallet ? 'wallet connected' : 'wallet null')
      if (!wallet) {
        logger.info('[requestProofAny] Wallet is null, waiting...')
        return
      }
      
      clearTimeout(timeout)
      off()
      
      const proof = wallet.connectItems?.tonProof?.proof
      logger.info('[requestProofAny] Proof from wallet:', proof ? 'received' : 'missing')
      logger.info('[requestProofAny] connectItems:', wallet.connectItems)
      if (proof) {
        resolve({ proof, wallet })
      } else {
        reject(new Error('Wallet connected without proof'))
      }
    })
    
    logger.info('[requestProofAny] Opening modal...')
    tonConnectUI.openModal().catch((e) => {
      logger.error('[requestProofAny] openModal error', e)
      clearTimeout(timeout)
      if (off) off()
      reject(e)
    })
  })
  
  logger.info('[requestProofAny] Method 3 success, got proof')
  return result
}

/**
 * POST /tonconnect/nonce - Get nonce for TON Proof
 * @param {string} session - Session ID
 * @returns {Promise<{ok: boolean, nonce: string, session: string}>}
 */
export async function getTonConnectNonce(session) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/nonce', { session })
  return res.data
}

/**
 * POST /tonconnect/verify - Verify TON Proof signature
 * @param {object} data - { session, publicKey, address, proof: { signature, payload, timestamp, domain } }
 * @returns {Promise<{status: boolean, address: string}>}
 */
export async function verifyTonConnectSignature(data) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/verify', data)
  return res.data
}

/**
 * POST /tonconnect/deposit - Create deposit transaction
 * @param {object} params - { action: 'game' | 'gift', amount: number }
 * @returns {Promise<{id: string, validUntil: number, messages: Array<{address: string, amount: string, payload: string}>}>}
 */
export async function createDeposit(params) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/deposit', params)
  return res.data
}

/**
 * POST /tonconnect/check - Check deposit status
 * @param {object} params - { id: string, action: 'game' | 'gift' }
 * @returns {Promise<string>} - Status message
 */
export async function checkDeposit(params) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/check', params)
  return res.data
}

/**
 * High-level function: get nonce for new connection attempt
 * @returns {Promise<{session: string, nonce: string}>}
 */
export async function initTonConnectSession() {
  const session = generateSessionId()
  logger.info('[initTonConnectSession] Requesting nonce', { session })
  
  const data = await getTonConnectNonce(session)
  logger.info('[initTonConnectSession] Received response', data)
  
  // Backend returns {session, nonce} without "ok" field
  if (!data.nonce) {
    logger.error('[initTonConnectSession] No nonce in response', data)
    throw new Error(data.error || 'Failed to get nonce')
  }
  
  logger.info('[initTonConnectSession] Success', { session: data.session, nonce: data.nonce })
  return {
    session: data.session,
    nonce: data.nonce,
  }
}

export default { 
  requestProofAny,
  getTonConnectNonce, 
  verifyTonConnectSignature,
  createDeposit,
  checkDeposit,
  initTonConnectSession,
}
