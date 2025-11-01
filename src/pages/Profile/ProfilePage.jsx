import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// import PromoCodeSection from './PromoCodeSection'
import { useTelegram } from '../../providers/TelegramProvider'
import ProfileSvg from '../../components/icons/ProfileIcon.svg'
import TonSvg from '../../components/icons/TonIcon.svg'
import EmptyPersonSvg from '../../components/icons/EmptyPerson.svg'
import { getProfile } from '../../shared/api/users.api'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'
import { getApiInstance } from '../../shared/api/client'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, authDone } = useTelegram()
  const { withLoading } = useLoading()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [walletStatus, setWalletStatus] = useState('')
  const [activeTab, setActiveTab] = useState('new') // new | last | wins | lose
  const [tonConnectUI] = useTonConnectUI()
  const userAddressFriendly = useTonAddress() // отображать в UI
  const connectedAddress = userAddressFriendly || null
  const [currentSession, setCurrentSession] = useState(null) // Сохраняем session для verify

  // Derived data from Telegram user
  const displayName = user?.username
    ? `@${user.username}`
    : `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—'
  const avatarSrc = user?.photo_url || EmptyPersonSvg

  // Автоматическая верификация при подключении кошелька
  useEffect(() => {
    if (!tonConnectUI || !authDone) return

    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) {
        setWalletStatus('')
        return
      }

      // Проверяем наличие proof
      const proof = wallet.connectItems?.tonProof?.proof
      if (!proof) {
        setWalletStatus('Кошелёк подключён без подтверждения')
        return
      }

      // Если нет сохранённой сессии, значит это не наше подключение
      if (!currentSession) {
        logger.warn('No session found for proof verification')
        return
      }

      // Если есть proof, отправляем на верификацию
      try {
        setWalletStatus('Отправляю подтверждение на сервер...')
        
        const apiInstance = getApiInstance()
        
        const account = wallet.account
        if (!account) throw new Error('Missing account data')

        const domainStr = typeof proof.domain === 'string' ? proof.domain : proof.domain?.value

        const verifyResp = await apiInstance.post('/tonconnect/verify', {
          session: currentSession, // Используем сохранённую сессию
          publicKey: account.publicKey,
          address: account.address,
          proof: {
            signature: proof.signature,
            payload: proof.payload,
            domain: domainStr,
            timestamp: Number(proof.timestamp) // Убедимся что это число
          }
        })

        const verifyData = verifyResp.data

        if (verifyData?.status) {
          setWalletStatus(`✓ Кошелёк подтверждён`)
          setCurrentSession(null) // Очистить сессию после успеха
        } else {
          setWalletStatus('Ошибка верификации')
        }
      } catch (e) {
        setWalletStatus(`Ошибка: ${e?.message || String(e)}`)
        logger.error('Wallet verification error:', e)
      }
    })

    return () => unsubscribe()
  }, [tonConnectUI, authDone, currentSession])

  // Функция для запроса nonce и установки tonProof параметров
  async function requestTonProof() {
    try {
      setWalletStatus('Получаю nonce...')
      const session = crypto.randomUUID()
      setCurrentSession(session) // Сохраняем session
      
      const apiInstance = getApiInstance()

      const nonceResp = await apiInstance.post('/tonconnect/nonce', { session })
      const nonceData = nonceResp.data
      if (!nonceData?.nonce) throw new Error('Nonce malformed')

      // Установить tonProof параметры перед подключением
      tonConnectUI.setConnectRequestParameters({
        state: 'ready',
        value: { tonProof: nonceData.nonce }
      })

      setWalletStatus('Подключите кошелёк для подтверждения...')
    } catch (e) {
      setWalletStatus(`Ошибка: ${e?.message || String(e)}`)
      logger.error('requestTonProof error:', e)
      setCurrentSession(null) // Очистить при ошибке
    }
  }

  // Запрашиваем nonce при монтировании компонента
  useEffect(() => {
    if (tonConnectUI && authDone) {
      requestTonProof()
    }
  }, [tonConnectUI, authDone])

  // Load profile data from backend (authorized by token). Wait for authDone.
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!authDone) return
      try {
  setLoading(true)
  const prof = await withLoading(() => getProfile())
        if (cancelled) return
        setProfile(prof)
      } catch (e) {
        if (cancelled) return
  setError('Failed to load profile')
        logger.error('ProfilePage: getProfile error', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [authDone])

  // Derived: filtered/sorted history by active tab
  const displayedHistory = useMemo(() => {
    const items = Array.isArray(profile?.history) ? profile.history.filter(Boolean) : []
    // Decorate with parsed date and win flag/value
    const normalized = items.map((h) => {
      const raw = Number(h?.value ?? 0)
      const isWin = Number(h?.winner) === 1 || raw > 0
      const dt = h?.datetime ? new Date(h.datetime) : null
      return { ...h, _raw: raw, _isWin: isWin, _date: dt }
    })

    switch (activeTab) {
      case 'wins':
        return normalized.filter((h) => h._isWin)
      case 'lose':
        return normalized.filter((h) => !h._isWin)
      case 'last':
        return normalized.slice().sort((a, b) => {
          const ta = a._date ? a._date.getTime() : 0
          const tb = b._date ? b._date.getTime() : 0
          return ta - tb // old -> new
        })
      case 'new':
      default:
        return normalized.slice().sort((a, b) => {
          const ta = a._date ? a._date.getTime() : 0
          const tb = b._date ? b._date.getTime() : 0
          return tb - ta // new -> old
        })
    }
  }, [profile?.history, activeTab])

  return (
    <div className="mx-auto max-w-[390px] space-y-3">

      {/* AUTH STATUS removed by design request */}

      {/* AVATAR + NAME / WALLET */}
      <section className="flex flex-col items-center gap-2 mt-1">
        <div className="w-24 h-24 relative rounded-3xl">
          <img
            className="w-24 h-24 rounded-3xl border-2 border-zinc-500 object-cover bg-neutral-200"
            src={avatarSrc}
            alt="avatar"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = EmptyPersonSvg
            }}
          />
        </div>

        <div className="w-full flex flex-col items-center gap-1">
          <div className="w-full text-center text-neutral-50 text-base font-normal font-sans">
            {displayName}
          </div>
          {/* TON Connect address display */}
          <div className="text-center text-neutral-700 text-xs font-mono font-normal max-w-[260px] truncate">
            {connectedAddress || '—'}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {/* Кнопка подключения/меню кошелька с автоматическим proof */}
            <TonConnectButton className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
          {/* Статус под кнопкой */}
          {walletStatus && (
            <div className="mt-2 text-xs text-white/70">{walletStatus}</div>
          )}
        </div>
      </section>

      {/* STATS (3 CARDS) — from backend */}
      <section className="w-full px-2.5 grid grid-cols-3 gap-1.5">
        <div className="p-2 relative bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60 flex flex-col justify-center gap-1 overflow-hidden">
          <div className="inline-flex items-start gap-1">
            <div className="text-orange-400 text-lg font-medium font-sans">{profile?.percantage ?? 0}%</div>
          </div>
          <div className="text-white/50 text-xs font-normal font-sans">Win games</div>
        </div>
        <div className="p-2 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60 flex flex-col justify-center gap-1 overflow-hidden">
          <div className="flex items-start gap-1">
            <div className="text-neutral-50 text-lg font-medium font-sans">{profile?.count_games ?? 0}</div>
          </div>
          <div className="text-white/50 text-xs font-normal font-sans">All games</div>
        </div>
        <div className="p-2 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60 flex flex-col justify-center gap-1 overflow-hidden">
          <div className="inline-flex items-center gap-1.5">
            <div className="text-neutral-50 text-lg font-medium font-sans">{Number(profile?.value ?? 0).toFixed(2)}</div>
            <img src={TonSvg} alt="TON" className="w-3.5 h-3.5 object-contain translate-y-[0.5px]" />
          </div>
          <div className="text-white/50 text-xs font-normal font-sans">Won TON</div>
        </div>
      </section>

      {/* REFERRAL — removed */}

      {/* PROMO CODE — временно скрыто */}
      {false && (
        <div>
          {/* <PromoCodeSection /> */}
        </div>
      )}

      {/* STREAMER MODE — commented out */}
      {false && (
        <section className="w-full px-2.5">
          <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] outline outline-1 outline-offset-[-1px] outline-neutral-700 flex flex-col gap-3 overflow-hidden">
            <div className="w-full flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="text-neutral-50 text-base font-semibold font-sans">Streamer Mode</div>
                <div className="text-neutral-700 text-xs font-normal font-sans">
                  Hides everything you<br />can be streamsniped with
                </div>
              </div>
              <div className="w-20 p-0.5 bg-gradient-to-b from-orange-400 to-amber-700 rounded-xl flex justify-end">
                <div className="w-10 h-10 py-3 bg-neutral-50 rounded-xl" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GAME HISTORY (from backend) */}
      {/* QUICK LINKS */}
      <section className="w-full px-2.5">
        <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <div className="flex flex-col">
              <div className="text-neutral-50 text-base font-semibold font-sans">Game Guide</div>
              <div className="text-white/60 text-xs">How it works, fees, timing</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/rules')}
            className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm"
          >Open</button>
        </div>
      </section>

      {/* GAME HISTORY (from backend) */}
      <section className="w-full px-2.5">
    <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60 space-y-2">
  <div className="text-neutral-50 text-base font-semibold font-sans">Game history</div>

        {/* tabs */}
        <div className="flex gap-1.5">
          {[
            { key: 'new', label: 'New' },
            { key: 'last', label: 'Last' },
            { key: 'wins', label: 'Wins' },
            { key: 'lose', label: 'Lose' },
          ].map((tab) => {
            const isActive = activeTab === tab.key
            const base = 'h-10 px-3 bg-black rounded-xl border flex items-center cursor-pointer select-none'
            const cls = isActive
              ? 'bg-neutral-700 border-neutral-700 text-white'
              : 'border-neutral-700/60 text-white'
            return (
              <button
                key={tab.key}
                type="button"
                className={`${base} ${cls}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <div className="text-sm font-bold font-sans">{tab.label}</div>
              </button>
            )
          })}
        </div>

        {/* items from API */}
        <div className="space-y-2">
          {displayedHistory.length > 0 ? (
            displayedHistory.map((h, i) => {
              const win = !!h._isWin
              const date = h?.datetime || ''
              const amountAbs = Math.abs(Number(h?._raw ?? h?.value ?? 0))
              const enemyPhoto = h?.photo_url_enemy || EmptyPersonSvg
              const enemyName = h?.username_enemy || 'Opponent'
              return (
                <div key={i} className={`w-full p-3 bg-black rounded-xl border ${win ? 'border-green-500' : 'border-red-700'} flex justify-between items-end overflow-hidden`}>
                  <div className="inline-flex flex-col justify-end gap-1">
                    <div className="inline-flex items-center gap-1">
                      <img
                        className="w-8 h-8 rounded-lg object-cover"
                        src={enemyPhoto}
                        alt="opponent"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = EmptyPersonSvg
                        }}
                      />
                      <div className="inline-flex flex-col justify-center gap-0.5">
                        <div className="text-white text-sm font-light font-sans [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">{enemyName}</div>
                        <div className="text-zinc-100/25 text-[10px] font-light font-sans [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">{date}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 bg-neutral-800 rounded-[10px]">
                    <div className="inline-flex items-center gap-1">
                      <div className={`${win ? 'text-green-500' : 'text-red-700'} text-sm font-semibold font-sans`}>{win ? '+' : '-'}{amountAbs.toFixed(2)}</div>
                      <img src={TonSvg} alt="TON" className="w-4 h-4 object-contain" />
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-white/40 text-xs">{loading ? 'Loading…' : 'No game history'}</div>
          )}
        </div>
    </div>
  </section>

      <div className="h-2" />
    </div>
  )
}
