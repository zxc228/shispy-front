import { getApiInstance } from './client'

// GET /tonconnect/payload -> { payload: string, expireAt?: number }
export async function getTonConnectPayload() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/tonconnect/payload')
  return res.data
}

// POST /tonconnect/verify { address, proof } -> { verified: boolean, reason?: string }
export async function verifyTonConnectProof(address, proof) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/tonconnect/verify', { address, proof })
  return res.data
}

export default { getTonConnectPayload, verifyTonConnectProof }
