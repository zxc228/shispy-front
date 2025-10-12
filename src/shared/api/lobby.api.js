import api, { apiLocal } from './client'

// GET /lobby/queque -> Array of queue items
export async function getQueue() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/lobby/queque')
    return res.data
  } else {
    const res = await api.get('/lobby/queque')
    return res.data
  }
}

// GET /lobby/retrieve_gifts -> { gifts: [{ gid, value, slug, photo }] }
export async function getGifts() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/lobby/retrieve_gifts')
    return res.data
  } else {
    const res = await api.get('/lobby/retrieve_gifts')
    return res.data
  }
}

export default { getQueue, getGifts }
