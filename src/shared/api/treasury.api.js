import { getApiInstance } from './client'

// GET /treasury/retrieve_gifts
// Expected server responses supported:
// - Array<{ gid, value, slug, photo }>
// - { data: Array<...>, ... }
// - { gifts: Array<...>, ... }
export async function getTreasuryGifts() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/treasury/retrieve_gifts')
  const body = res.data
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.gifts)) return body.gifts
  return []
}

export default { getTreasuryGifts }
