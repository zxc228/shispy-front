import { useEffect, useRef } from 'react'
import { useIsConnectionRestored, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { getTonConnectPayload, verifyTonConnectProof } from '../../shared/api/tonconnect.api'
import { setWallet as apiSetWallet } from '../../shared/api/wallet.api'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'

/**
 * TonConnectBridge
 * - Before connect: requests payload from backend and sets it via setConnectRequestParameters
 * - After connect: verifies proof with backend and stores wallet address
 */
export default function TonConnectBridge() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const restored = useIsConnectionRestored()
  const { withLoading } = useLoading()
  const preparedRef = useRef(false)

  // Prepare payload when no wallet connected (once)
  useEffect(() => {
    let cancelled = false
    async function prepare() {
      if (!restored) return
      if (wallet) return
      if (preparedRef.current) return
      try {
        preparedRef.current = true
        tonConnectUI.setConnectRequestParameters({ state: 'loading' })
        const res = await withLoading(() => getTonConnectPayload())
        const payload = res?.payload
        if (cancelled) return
        if (payload) {
          tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: payload } })
        } else {
          tonConnectUI.setConnectRequestParameters(null)
        }
      } catch (e) {
        logger.warn('TonConnectBridge: payload fetch failed', e)
        tonConnectUI.setConnectRequestParameters(null)
        preparedRef.current = false
      }
    }
    prepare()
    return () => { cancelled = true }
  }, [restored, wallet, tonConnectUI, withLoading])

  // On connect -> verify proof and save wallet
  useEffect(() => {
    const off = tonConnectUI.onStatusChange(async (w) => {
      try {
        if (!w) return
        const address = w.account?.address
        const proof = w.connectItems?.tonProof && 'proof' in w.connectItems.tonProof
          ? w.connectItems.tonProof.proof
          : null

        if (proof && address) {
          const res = await verifyTonConnectProof(address, proof)
          logger.debug('TonConnectBridge: verify result', res)
        }

        if (address) {
          await apiSetWallet(address)
        }
      } catch (e) {
        logger.error('TonConnectBridge: status handler error', e)
      }
    })
    return () => off()
  }, [tonConnectUI])

  return null
}
