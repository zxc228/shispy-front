import api, { apiLocal } from './client'

// POST /auth/telegram with initData string; returns { status, access_token, token_type }
export async function authTelegram(initData) {
  // If running under HTTPS (e.g., Cloudflare tunnel), use same-origin to avoid mixed-content
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  
  if (useSameOrigin) {
    // Use apiLocal (no baseURL) for same-origin request with all interceptors
    const res = await apiLocal.post('/auth/telegram', { initData })
    return res.data
  } else {
    // Use configured api client for development
    const res = await api.post('/auth/telegram', { initData })
    return res.data
  }
}

export default { authTelegram }
