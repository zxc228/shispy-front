import { getApiInstance } from './client'

// GET /referrals/payments -> { persons: number, amount: number }
export async function getReferralPayments() {
  const apiInstance = getApiInstance()
  const res = await apiInstance.get('/referrals/payments')
  return res.data
}

export default { getReferralPayments }
