import { getApiInstance } from './client'

// Эти методы больше не нужны - баланс храним локально, wallet сохраняется через tonconnect/verify

// Метод оставляем для совместимости, но теперь баланс локальный
export async function getBalance() {
  // Баланс теперь хранится локально, возвращаем заглушку
  return { amount: 0 }
}

export default { getBalance }
