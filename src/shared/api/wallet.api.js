import { getApiInstance } from './client'

// POST /wallet { wallet }
export async function setWallet(wallet) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/wallet', { wallet })
  return res.data
}

// GET /wallet -> { wallet: string }
export async function getWallet() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/wallet')
  return res.data
}

// POST /wallet/invoice { amount }
export async function createInvoice(amount) {
  const apiInstance = getApiInstance()
  const res = await apiInstance.post('/wallet/invoice', { amount })
  return res.data
}

// GET /wallet/balance -> { amount: number }
export async function getBalance() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/wallet/balance')
  return res.data
}

export default { setWallet, getWallet, createInvoice, getBalance }
