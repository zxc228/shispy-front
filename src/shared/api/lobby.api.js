import api, { apiLocal } from './client'

// GET /lobby/queque -> Array of queue items
export async function getQueue() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/lobby/list')
    return res.data
  } else {
    const res = await api.get('/lobby/list')
    return res.data
  }
}

// GET /lobby/retrieve_gifts -> { gifts: [{ gid, value, slug, photo }] }
export async function getGifts() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/lobby/retrieve_gifts')
    const data = res.data
    const gifts = Array.isArray(data) ? data : (Array.isArray(data?.gifts) ? data.gifts : [])
    return { gifts }
  } else {
    const res = await api.get('/lobby/retrieve_gifts')
    const data = res.data
    const gifts = Array.isArray(data) ? data : (Array.isArray(data?.gifts) ? data.gifts : [])
    return { gifts }
  }
}

// POST /lobby/create_battle { gifts: number[] } -> { status: boolean }
export async function createBattle(gifts) {
  const payload = { gifts }
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.post('/lobby/create_battle', payload)
    return res.data
  } else {
    const res = await api.post('/lobby/create_battle', payload)
    return res.data
  }
}

// GET /lobby/waiting_status -> { status: boolean }
export async function getWaitingStatus() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/lobby/waiting_status')
    return res.data
  } else {
    const res = await api.get('/lobby/waiting_status')
    return res.data
  }
}

// GET /lobby/cancel -> { status: boolean }
export async function cancelLobby() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/lobby/cancel')
    return res.data
  } else {
    const res = await api.get('/lobby/cancel')
    return res.data
  }
}

export default { getQueue, getGifts, createBattle, getWaitingStatus, cancelLobby }
