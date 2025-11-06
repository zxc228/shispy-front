import { getApiInstance } from './client'
import { logger } from '../logger'

// Generate a unique session ID for TON Connect flow
function generateSessionId() {
  return crypto.randomUUID()
}

// POST /tonconnect/nonce { session } -> { session, nonce }
export async function getTonConnectNonce(session) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/nonce', { session })
  return res.data
}

// POST /tonconnect/verify { session, publicKey, address, proof } -> { status: boolean, address?: string, error?: string }
export async function verifyTonConnectProof(data) {
  logger.info('verifyTonConnectProof: Sending data to backend:', JSON.stringify(data, null, 2))
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/verify', data)
  logger.info('verifyTonConnectProof: Response from backend:', res.data)
  return res.data
}

// High-level function: initialize new TON Connect session with nonce
export async function initTonConnectSession() {
  const session = generateSessionId()
  const nonceData = await getTonConnectNonce(session)
  return {
    session,
    nonce: nonceData.nonce,
  }
}

// POST /tonconnect/deposit { action, amount } -> { id, validUntil, messages }
export async function createDeposit(action = 'game', amount = 1) {
  const apiInstance = getApiInstance()
  logger.info('createDeposit: Request params', { action, amount, type: typeof amount })
  const res = await apiInstance.post('/tonconnect/deposit', { action, amount })
  logger.info('createDeposit: Response', res.data)
  return res.data
}

// POST /tonconnect/check { id, action } -> status string
export async function checkDeposit(id, action = 'game') {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/check', { id, action })
  return res.data
}

export default { 
  getTonConnectNonce, 
  verifyTonConnectProof,
  initTonConnectSession,
  createDeposit,
  checkDeposit,
}
