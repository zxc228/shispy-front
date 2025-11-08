import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../../providers/TelegramProvider'
import TonSvg from '../../components/icons/TonIcon.svg'
import EmptyPersonSvg from '../../components/icons/EmptyPerson.svg'
import { getProfile } from '../../shared/api/users.api'
import { getReferralPayments } from '../../shared/api/referrals.api'
import { logger } from '../../shared/logger'
import { useLoading } from '../../providers/LoadingProvider'
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react'
import { useTonProof } from '../../hooks/useTonProof'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, authDone } = useTelegram()
  const { withLoading } = useLoading()
  const [profile, setProfile] = useState(null)
  const [referrals, setReferrals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('new') // new | last | wins | lose
  const [showReferralModal, setShowReferralModal] = useState(false)
  
  // TonConnect integration
  const userAddressFriendly = useTonAddress()
  const { status: walletStatus } = useTonProof()
  const connectedAddress = userAddressFriendly || null

  // Derived data from Telegram user
  const displayName = user?.username
    ? `@${user.username}`
    : `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—'
  const avatarSrc = user?.photo_url || EmptyPersonSvg

  // Load profile data from backend (authorized by token). Wait for authDone.
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!authDone) return
      try {
        setLoading(true)
        const [prof, refs] = await Promise.all([
          withLoading(() => getProfile()),
          getReferralPayments().catch(e => {
            logger.warn('ProfilePage: getReferralPayments error', e)
            return { persons: 0, amount: 0 }
          })
        ])
        if (cancelled) return
        setProfile(prof)
        setReferrals(refs)
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
          {/* Wallet connect button */}
          <div className="mt-2 flex items-center gap-2">
            <TonConnectButton />
          </div>
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

      {/* REFERRAL SECTION */}
      <section className="w-full px-2.5">
        <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <div className="flex flex-col">
                <div className="text-neutral-50 text-base font-semibold font-sans">Referral Program</div>
                <div className="text-white/60 text-xs">Invite friends and earn</div>
              </div>
            </div>
            <button
              onClick={() => setShowReferralModal(true)}
              className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm hover:bg-neutral-700 active:scale-95 transition-all"
            >
              Invite
            </button>
          </div>
          
          {/* Referral Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-black rounded-xl border border-neutral-700/60 flex flex-col gap-1">
              <div className="text-neutral-50 text-lg font-medium font-sans">{referrals?.persons ?? 0}</div>
              <div className="text-white/50 text-xs font-normal font-sans">Friends</div>
            </div>
            <div className="p-2 bg-black rounded-xl border border-neutral-700/60 flex flex-col gap-1">
              <div className="inline-flex items-center gap-1.5">
                <div className="text-neutral-50 text-lg font-medium font-sans">{Number(referrals?.amount ?? 0).toFixed(2)}</div>
                <img src={TonSvg} alt="TON" className="w-3.5 h-3.5 object-contain translate-y-[0.5px]" />
              </div>
              <div className="text-white/50 text-xs font-normal font-sans">Earned</div>
            </div>
          </div>
        </div>
      </section>

      {/* REFERRAL MODAL */}
      {showReferralModal && (
        <ReferralModal
          userId={user?.id}
          onClose={() => setShowReferralModal(false)}
        />
      )}

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

/* ========== Referral Modal ========== */

function ReferralModal({ userId, onClose }) {
  const [copied, setCopied] = useState(false)
  
  // Generate referral link
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'shipsy_bot'
  const referralLink = userId 
    ? `https://t.me/${botUsername}?start=${userId}`
    : `https://t.me/${botUsername}`
  
  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralLink)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = referralLink
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      setCopied(true)
      
      // Haptic feedback
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
      
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  const handleShare = () => {
    const text = `🎮 Join me on Shipsy - the ultimate battle game!\n\n💰 Play, compete, and win TON rewards!\n\n${referralLink}`
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`)
    } else {
      // Fallback
      window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`, '_blank')
    }
    onClose()
  }
  
  return (
    <div 
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 animate-[fadeIn_0.2s_ease-out] px-4"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 rounded-2xl border border-neutral-700 max-w-sm w-full p-6 space-y-4 animate-[slideUp_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-neutral-800 border border-neutral-700 grid place-items-center">
          <span className="text-3xl">👥</span>
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center">
          Invite Friends
        </h2>
        
        {/* Description */}
        <p className="text-neutral-300 text-sm text-center">
          Share your link and earn rewards
        </p>
        
        {/* Link Display */}
        <div className="space-y-2">
          <div className="p-3 bg-neutral-800 rounded-xl border border-neutral-700 text-white text-xs font-mono break-all">
            {referralLink}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCopy}
            className={`flex-1 h-12 rounded-xl font-semibold transition-all active:scale-95 ${
              copied 
                ? 'bg-green-600 border border-green-500 text-white' 
                : 'bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700'
            }`}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 h-12 rounded-xl 
                       bg-gradient-to-b from-orange-400 to-amber-700 
                       shadow-[inset_0_-1px_0_0_rgba(230,141,74,1)]
                       text-white font-semibold
                       active:scale-95 active:translate-y-[0.5px]
                       transition-all"
          >
            Share
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="w-full text-neutral-400 text-sm hover:text-neutral-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
