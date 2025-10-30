import { getApiInstance } from './client'

// GET /treasury/retrieve_gifts
// Server response: { gwc: number, data: [{ gid: string, value: number, slug: string }] }
export async function getTreasuryGifts() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/treasury/retrieve_gifts')
  const body = res.data
  
  // New API structure: { gwc: number, data: [...] }
  if (body && typeof body === 'object' && Array.isArray(body.data)) {
    return {
      gwc: body.gwc || 0,
      gifts: body.data
    }
  }
  
  // Fallback for unexpected formats
  if (Array.isArray(body)) return { gwc: 0, gifts: body }
  if (Array.isArray(body?.gifts)) return { gwc: 0, gifts: body.gifts }
  
  return { gwc: 0, gifts: [] }
}

export default { getTreasuryGifts }
