import { getApiInstance } from './client'

// Generate a unique session ID for TON Connect flow
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// GET /tonconnect/nonce/{session_id} -> { nonce: string }
export async function getTonConnectNonce(sessionId) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get(`/tonconnect/nonce/${sessionId}`)
  return res.data
}

// POST /tonconnect/verify { publicKey, address, signature, payload, session } -> { ok: boolean, wallet?: string, error?: string }
export async function verifyTonConnectSignature(data) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/verify', data)
  return res.data
}

// High-level function: get nonce for new connection attempt
export async function initTonConnectSession() {
  const sessionId = generateSessionId()
  const nonceData = await getTonConnectNonce(sessionId)
  return {
    sessionId,
    nonce: nonceData.nonce,
  }
}

export default { 
  getTonConnectNonce, 
  verifyTonConnectSignature,
  initTonConnectSession,
}
