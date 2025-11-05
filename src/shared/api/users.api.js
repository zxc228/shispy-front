import { getApiInstance } from './client'

// GET /users/profile -> { percantage, count_games, value, history: [...] }
export async function getProfile() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/users/profile')
  return res.data
}

// GET /users/balance -> { amount: number }
export async function getBalance() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/users/balance')
  return res.data
}

export default { getProfile, getBalance }
