import { getApiInstance } from './client'

// POST /auth/telegram with initData string; returns { status, access_token, token_type }
export async function authTelegram(initData) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/auth/telegram', { initData })
  return res.data
}

export default { authTelegram }
