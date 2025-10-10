import axios from 'axios'
import { logger } from '../logger'

// Base API instance configured with Vite env
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 15000,
})

// Create instance for same-origin requests (no baseURL)
export const apiLocal = axios.create({
  timeout: 15000,
})

const ACCESS_TOKEN_KEY = 'access_token'

export function getToken() {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function apiSetAccessToken(token) {
  if (!token) return
  api.defaults.headers.common.Authorization = `Bearer ${token}`
}

// On startup, set header if token exists
const existing = getToken()
if (existing) {
  apiSetAccessToken(existing)
}

// Add interceptors to both instances
function addInterceptors(instance) {
  // Request interceptor: attach Authorization from session if present
  instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    // Log request (mask auth)
    const maskedAuth = config.headers?.Authorization ? logger.mask(config.headers.Authorization) : undefined
    // normalize url join for log display only
    const fullUrl = config.baseURL ? `${String(config.baseURL).replace(/\/$/, '')}${String(config.url || '')}` : config.url
    logger.debug('API request', {
      method: config.method,
      url: fullUrl,
      headers: { ...config.headers, Authorization: maskedAuth },
      data: config.data,
    })
    return config
  })

  // Response interceptor: normalize errors
  instance.interceptors.response.use(
    (res) => {
      logger.debug('API response', {
        url: res.config?.url,
        status: res.status,
        data: res.data,
      })
      return res
    },
    (error) => {
      const { response } = error || {}
      if (!response) return Promise.reject(error)

      if (response.status === 422) {
        // Expecting a structure with e.g. { detail: [{ msg, loc, type }, ...] } or string
        const detail = response.data?.detail
        let message = 'Validation error'
        if (typeof detail === 'string') {
          message = detail
        } else if (Array.isArray(detail) && detail.length && detail[0]?.msg) {
          message = detail[0].msg
        }
        logger.warn('API error 422', { url: response.config?.url, message, detail })
        return Promise.reject({
          status: 422,
          message,
          detail,
          original: error,
        })
      }

      const message = response.data?.message || response.statusText || 'Request error'
      logger.warn('API error', { url: response.config?.url, status: response.status, message, data: response.data })
      return Promise.reject({
        status: response.status,
        message,
        detail: response.data,
        original: error,
      })
    }
  )
}

// Apply interceptors to both instances
addInterceptors(api)
addInterceptors(apiLocal)

export default api
