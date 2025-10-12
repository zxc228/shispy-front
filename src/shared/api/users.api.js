import api, { apiLocal } from './client'

// GET /users/profile -> { percantage, count_games, value, history: [...] }
export async function getProfile() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/users/profile')
    return res.data
  } else {
    const res = await api.get('/users/profile')
    return res.data
  }
}

export default { getProfile }
