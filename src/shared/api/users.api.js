import api from './client'

// GET /users/me -> string (username or id)
export async function getMe() {
  const res = await api.get('/users/me')
  return res.data
}

// GET /users/profile -> { percantage, count_games, value, history: [...] }
export async function getProfile() {
  const res = await api.get('/users/profile')
  return res.data
}

export default { getMe, getProfile }
