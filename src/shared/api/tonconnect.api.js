import api, { apiLocal } from './client'

// GET /tonconnect/payload -> { payload: string, expireAt?: number }
export async function getTonConnectPayload() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/tonconnect/payload')
    return res.data
  } else {
    const res = await api.get('/tonconnect/payload')
    return res.data
  }
}

// POST /tonconnect/verify { address, proof } -> { verified: boolean, status?: string }
export async function verifyTonConnectProof(address, proof) {
  const payload = { address, proof }
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.post('/tonconnect/verify', payload)
    return res.data
  } else {
    const res = await api.post('/tonconnect/verify', payload)
    return res.data
  }
}

export default { getTonConnectPayload, verifyTonConnectProof }
