import api, { apiLocal } from './client'

// GET /treasury/retrieve_gifts -> Array<{ gid, value, slug, photo }>
export async function getTreasuryGifts() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/treasury/retrieve_gifts')
    return Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.gifts) ? res.data.gifts : [])
  } else {
    const res = await api.get('/treasury/retrieve_gifts')
    return Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.gifts) ? res.data.gifts : [])
  }
}

export default { getTreasuryGifts }
