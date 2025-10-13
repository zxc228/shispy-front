import api, { apiLocal } from './client'

// POST /wallet/set_wallet { wallet }
export async function setWallet(wallet) {
  const payload = { wallet }
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.post('/wallet', payload)
    return res.data
  } else {
    const res = await api.post('/wallet', payload)
    return res.data
  }
}

// GET /wallet -> { wallet: string }
export async function getWallet() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/wallet')
    return res.data
  } else {
    const res = await api.get('/wallet')
    return res.data
  }
}

// POST /wallet/invoce { amount }
export async function createInvoice(amount) {
  const payload = { amount }
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.post('/wallet/invoce', payload)
    return res.data
  } else {
    const res = await api.post('/wallet/invoce', payload)
    return res.data
  }
}

// GET /wallet/balance -> { amount: number }
export async function getBalance() {
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.get('/wallet/balance')
    return res.data
  } else {
    const res = await api.get('/wallet/balance')
    return res.data
  }
}

export default { setWallet, getWallet, createInvoice, getBalance }
