import { getApiInstance } from './client'

// GET /users/profile -> { percantage, count_games, value, history: [...] }
export async function getProfile() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/users/profile')
  return res.data
}

export default { getProfile }
