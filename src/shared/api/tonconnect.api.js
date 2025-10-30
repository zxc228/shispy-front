import { getApiInstance } from './client'

// GET /tonconnect/generate_payload -> { payload: string, expires_at?: number }
export async function getTonConnectPayload() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/tonconnect/generate_payload')
  return res.data
}

// POST /tonconnect/verify { address, proof } -> { verified: boolean, reason?: string }
export async function verifyTonConnectProof(address, proof) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/verify', { address, proof })
  return res.data
}

export default { getTonConnectPayload, verifyTonConnectProof }
