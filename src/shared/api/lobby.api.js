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

export default { getQueue }
