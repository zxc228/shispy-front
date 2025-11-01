import { useState } from 'react'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { getApiInstance, getToken } from '../../shared/api/client'
import { logger } from '../../shared/logger'
import { useBalance } from '../../providers/BalanceProvider'

export default function ConnectAndVerifyButton() {
  const [tonConnectUI] = useTonConnectUI()
  const userAddress = useTonAddress()
  const { refresh: refreshBalance } = useBalance()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  async function requestProofAny(payload) {
    // 1) New API
    if (typeof tonConnectUI.requestProof === 'function') {
      try {
        const res = await tonConnectUI.requestProof({ payload })
        return { proof: res?.proof, wallet: tonConnectUI.wallet }
      } catch {}
    }
    // 2) Low-level API
    if (tonConnectUI.connector && typeof tonConnectUI.connector.requestProof === 'function') {
      try {
        const res = await tonConnectUI.connector.requestProof({ payload })
        return { proof: res?.proof, wallet: tonConnectUI.wallet }
      } catch {}
    }
    // 3) First-time connect with tonProof
    tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: { payload } } })
    const result = await new Promise((resolve, reject) => {
      const off = tonConnectUI.onStatusChange((wallet) => {
        if (!wallet) return
        off()
        const proof = wallet.connectItems?.tonProof?.proof
        if (proof) resolve({ proof, wallet })
        else reject(new Error('Wallet connected without proof'))
      })
      tonConnectUI.openModal().catch((e) => {
        off()
        reject(e)
      })
    })
    return result
  }

  const LINK_ONLY_NO_PROOF = true // включено: подключаем кошелёк без TON Proof и без verify

  async function onClick() {
    try {
      setLoading(true)
      setStatus('Подготовка...')

      const token = getToken()
      if (!token) {
        throw new Error('Нет авторизации Telegram')
      }

      // РЕЖИМ БЕЗ PROOF: просто подключаем кошелёк и выходим
      if (LINK_ONLY_NO_PROOF) {
        // Если уже подключён, просто показать статус
        if (tonConnectUI.wallet) {
          setStatus('✅ Кошелёк подключен')
          setTimeout(() => setStatus(''), 1200)
          return
        }
        // Иначе открываем модал для подключения
        setStatus('Открой кошелёк и подтверди подключение')
        await tonConnectUI.openModal()
        // Подождём появления аккаунта
        const started = Date.now()
        while (!tonConnectUI.wallet?.account && Date.now() - started < 60000) {
          await new Promise(r => setTimeout(r, 300))
        }
        if (!tonConnectUI.wallet?.account) throw new Error('Кошелёк не подключился')
        setStatus('✅ Кошелёк подключен')
        setTimeout(() => setStatus(''), 1200)
        return
      }

      // Стандартный поток с TON Proof (если выключить LINK_ONLY_NO_PROOF)
      const session = crypto.randomUUID()
      const api = getApiInstance()
      setStatus('Запрашиваю nonce...')
      const nonceResp = await api.post('/tonconnect/nonce', { session })
      const { nonce } = nonceResp.data || {}
      if (!nonce) throw new Error('Некорректный ответ nonce')
      setStatus('Открой кошелёк и подтверди TON Proof')
      const proofRes = await requestProofAny(nonce)
      await new Promise(r => setTimeout(r, 0))
      const account = tonConnectUI.wallet?.account
      if (!account) throw new Error('Нет аккаунта после proof')
      const { proof } = proofRes
      const domainStr = typeof proof.domain === 'string' ? proof.domain : proof.domain?.value
      setStatus('Проверяю подпись...')
      const verifyResp = await api.post('/tonconnect/verify', {
        session,
        publicKey: account.publicKey,
        address: account.address,
        proof: {
          signature: proof.signature,
          payload: proof.payload,
          domain: domainStr,
          timestamp: proof.timestamp
        }
      })
      const v = verifyResp.data
      if (!v?.status) throw new Error(v?.error || 'Verification failed')
      setStatus('✅ Кошелёк подтверждён')
      logger.info('ConnectAndVerify: verified', { address: v.address })
      await refreshBalance(true)
      setTimeout(() => setStatus(''), 1500)
    } catch (e) {
      logger.error('ConnectAndVerify: error', e)
      setStatus(`❌ ${e.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-sm font-medium ${loading ? 'opacity-60 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}
      >
        {loading ? 'Обработка...' : (userAddress ? 'Подтвердить кошелёк' : 'Подключить кошелёк')}
      </button>
      {status && (
        <div className="text-xs text-neutral-400 max-w-[260px] text-center">{status}</div>
      )}
    </div>
  )
}
