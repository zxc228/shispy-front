import React, { useEffect, useState } from 'react'
import { useTelegram } from '../../providers/TelegramProvider'
import { authTelegram } from '../../shared/api/auth.api'
import { apiSetAccessToken } from '../../shared/api/client'
import { logger } from '../../shared/logger'

export default function TelegramAuthGate({ children }) {
  const { isInTelegram, initData } = useTelegram()
  const [status, setStatus] = useState('idle') // idle | loading | ok | err
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function run() {
      if (!isInTelegram) return
      if (status !== 'idle') return
      if (!initData) {
        logger.info('AuthGate: initData is empty, waiting...')
        return
      }
      setStatus('loading')
      logger.info('AuthGate: starting telegram auth', { isInTelegram })
      try {
        logger.debug('AuthGate: sending initData', { length: (initData || '').length })
        const res = await authTelegram(initData || '')
        logger.debug('AuthGate: auth response', res)
        
        logger.debug('AuthGate: mounted check', { mounted })
        if (!mounted) {
          logger.debug('AuthGate: component unmounted, skipping token save')
          return
        }
        
        logger.debug('AuthGate: checking access_token', { 
          hasToken: !!res?.access_token, 
          tokenType: typeof res?.access_token,
          tokenLength: res?.access_token?.length 
        })
        
        if (res?.access_token) {
          logger.debug('AuthGate: saving token to storage')
          sessionStorage.setItem('access_token', res.access_token)
          apiSetAccessToken(res.access_token)
          if (mounted) {
            setStatus('ok')
            logger.info('AuthGate: token saved and header set', { status: 'ok' })
          } else {
            logger.debug('AuthGate: component unmounted, token saved to storage only')
          }
        } else {
          setError('Не удалось проверить подпись initData')
          setStatus('err')
          logger.warn('AuthGate: no access_token in response', { res })
        }
      } catch (e) {
        setError('Не удалось проверить подпись initData')
        setStatus('err')
        logger.error('AuthGate: auth error', e)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [isInTelegram, initData, status])

  // Add debug logging for status changes
  logger.debug('AuthGate render', { status, isInTelegram })

  return (
    <>
      {!isInTelegram && (
        <div className="px-3 py-2 text-xs text-white/80">
          Откройте мини-приложение внутри Telegram
        </div>
      )}
      {isInTelegram && status === 'loading' && (
        <div className="px-3 py-2 text-xs text-white/60">Проверка подписи…</div>
      )}
      {isInTelegram && status === 'err' && (
        <div className="px-3 py-2 text-xs text-red-400">{error}</div>
      )}
      {isInTelegram && status === 'ok' && (
        <div className="px-3 py-2 text-xs text-green-400">Подпись проверена ✓</div>
      )}
      {children}
    </>
  )
}
