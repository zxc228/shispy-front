import api, { apiLocal } from './client'

// POST /wallet/set_wallet { wallet }
export async function setWallet(wallet) {
  const payload = { wallet }
  const useSameOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (useSameOrigin) {
    const res = await apiLocal.post('/wallet/set_wallet', payload)
    return res.data
  } else {
    const res = await api.post('/wallet/set_wallet', payload)
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

export default { setWallet, createInvoice }
