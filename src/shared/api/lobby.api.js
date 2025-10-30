import { getApiInstance } from './client'

// GET /lobby/queque -> Array of queue items
export async function getQueue() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/lobby/list')
  return res.data
}

// GET /lobby/retrieve_gifts -> [{ gid: string, value: number, slug: string }]
export async function getGifts() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/lobby/retrieve_gifts')
  const data = res.data
  
  // New API returns array directly: [{ gid, value, slug }]
  if (Array.isArray(data)) {
    return data
  }
  
  // Fallback for unexpected formats
  if (Array.isArray(data?.gifts)) return data.gifts
  if (Array.isArray(data?.data)) return data.data
  
  return []
}

// POST /lobby/create_battle { gifts: string[] } -> { status: boolean }
export async function createBattle(gifts) {
  if (!Array.isArray(gifts) || gifts.length === 0) {
    throw new Error('At least one gift must be selected to create a battle')
  }
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/lobby/create_battle', { gifts })
  return res.data
}

// POST /lobby/join_battle { gifts: number[], queque_id: number } -> { game_id: number }
export async function joinBattle(gifts, queque_id) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/lobby/join_battle', { gifts, queque_id })
  return res.data
}

// GET /lobby/waiting_status -> { status: boolean }
export async function getWaitingStatus() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/lobby/waiting_status')
  return res.data
}

// GET /lobby/cancel -> { status: boolean }
export async function cancelLobby() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/lobby/cancel')
  return res.data
}

// POST /lobby/set_field { game_id, field } -> { status: boolean }
// Optional header Payment-Id must be provided when required by backend billing
export async function setTreasureField(game_id, field, paymentId = null) {
  const apiInstance = getApiInstance()
  const headers = { 'Content-Type': 'application/json' }
  if (paymentId) headers['Payment-Id'] = paymentId
  const res = await apiInstance.post('/lobby/set_field', { game_id, field }, { headers })
  return res.data
}

// POST /lobby/step { game_id, field } -> gifts[] on win OR { status: 0 } on miss
export async function step(game_id, field) {
  const payload = { game_id, field }
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const config = { headers: { 'Content-Type': 'application/json' } }
  if (useSameOrigin) {
    const res = await apiLocal.post('/lobby/step', payload, config)
    return res.data
  } else {
    const res = await api.post('/lobby/step', payload, config)
    return res.data
  }
}

// POST /lobby/concede { game_id, tuid } -> gifts[]
// NOTE: Backend expects winner_tuid in body; pass opponent tuid when known.
export async function concede(game_id, tuid) {
  const payload = { game_id, tuid }
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const config = { headers: { 'Content-Type': 'application/json' } }
  if (useSameOrigin) {
    const res = await apiLocal.post('/lobby/concede', payload, config)
    return res.data
  } else {
    const res = await api.post('/lobby/concede', payload, config)
    return res.data
  }
}

export default { getQueue, getGifts, createBattle, joinBattle, getWaitingStatus, cancelLobby, setTreasureField, step, concede }
