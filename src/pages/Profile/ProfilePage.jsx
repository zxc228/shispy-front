import React, { useEffect, useState } from 'react'
import PromoCodeSection from './PromoCodeSection'
import { useTelegram } from '../../providers/TelegramProvider'
import ProfileSvg from '../../components/icons/ProfileIcon.svg'
import TonSvg from '../../components/icons/TonIcon.svg'
import EmptyPersonSvg from '../../components/icons/EmptyPerson.svg'
import { getMe, getProfile } from '../../shared/api/users.api'
import { logger } from '../../shared/logger'

export default function ProfilePage() {
  const { user, isInTelegram } = useTelegram()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Derived data from Telegram user
  const displayName = user?.username
    ? `@${user.username}`
    : `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—'
  const avatarSrc = user?.photo_url || EmptyPersonSvg

  // Load profile data from backend (authorized by token)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        const [me, prof] = await Promise.all([
          getMe().catch((e) => { logger.warn('getMe failed', e); return null }),
          getProfile(),
        ])
        if (cancelled) return
        setProfile(prof)
      } catch (e) {
        if (cancelled) return
        setError('Не удалось загрузить профиль')
        logger.error('ProfilePage: getProfile error', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="mx-auto max-w-[390px] space-y-3">

      {/* AUTH STATUS removed by design request */}

      {/* AVATAR + NAME / WALLET */}
      <section className="flex flex-col items-center gap-2 mt-1">
        <div className="w-24 h-24 relative rounded-3xl">
          <span className="w-14 h-14 left-[48px] top-0 absolute rounded-3xl outline outline-2 outline-offset-[-1.04px] outline-orange-400 blur-[5.21px]" />
          <img
            className="w-24 h-24 left-0 top-0 absolute rounded-3xl border-2 border-zinc-500 object-cover bg-neutral-200"
            src={avatarSrc}
            alt="avatar"
            referrerPolicy="no-referrer"
          />
          <span className="w-14 h-14 left-[49px] -top-px absolute overflow-hidden">
            <span className="w-24 h-24 -left-[48px] top-0 absolute rounded-3xl border-4 border-orange-400" />
          </span>
          {/* profile icon badge */}
          <img src={ProfileSvg} alt="Profile" className="absolute -bottom-1 -right-1 w-6 h-6" />
        </div>

        <div className="w-full flex flex-col items-center gap-1">
          <div className="w-full text-center text-neutral-50 text-base font-normal font-sans">
            {displayName}
          </div>
          <div className="text-center text-neutral-700 text-xs font-normal font-sans">
            КОШЕЛЕК1234
          </div>
        </div>
      </section>

      {/* STATS SUMMARY (from backend) */}
      <section className="w-full px-2.5">
        <div className="w-full flex items-center justify-between">
          <div className="text-neutral-700 text-xs font-normal font-sans">
            Игр: {profile?.count_games ?? (loading ? '…' : '—')}
          </div>
          <div className="flex items-center gap-[5px]">
            <div className="text-neutral-700 text-xs font-normal font-sans">
              Побед: {profile?.percantage ?? (loading ? '…' : 0)}%
            </div>
            <div className="px-1 py-0.5 bg-gradient-to-b from-orange-400 to-amber-700 rounded flex items-center">
              <div className="text-white text-xs font-normal font-sans">{profile?.value ?? 0} TON</div>
            </div>
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
          <div className="text-white/50 text-xs font-normal font-sans">Wons TON</div>
        </div>
      </section>

      {/* REFERRAL — removed */}

      {/* PROMO CODE */}
      <PromoCodeSection />

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
  <section className="w-full px-2.5">
    <div className="p-3 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] rounded-xl shadow-[inset_0_-1px_0_0_rgba(88,88,88,1)] border border-neutral-700/60 space-y-2">
      <div className="text-neutral-50 text-base font-semibold font-sans">Game history</div>

        {/* tabs (визуально) */}
        <div className="flex gap-1.5">
          <div className="h-10 p-3 bg-neutral-700 rounded-xl flex items-center">
            <div className="text-white text-sm font-bold font-sans">New</div>
          </div>
          <div className="h-10 p-3 bg-black rounded-xl border border-neutral-700/60 flex items-center">
            <div className="text-white text-sm font-bold font-sans">Last</div>
          </div>
          <div className="h-10 p-3 bg-black rounded-xl border border-neutral-700/60 flex items-center">
            <div className="text-white text-sm font-bold font-sans">Wins</div>
          </div>
          <div className="h-10 p-3 bg-black rounded-xl border border-neutral-700/60 flex items-center">
            <div className="text-white text-sm font-bold font-sans">Lose</div>
          </div>
        </div>

        {/* items from API */}
        <div className="space-y-2">
          {Array.isArray(profile?.history) && profile.history.length > 0 ? (
            profile.history.filter(Boolean).map((h, i) => {
              const win = Number(h?.winner) === 1
              const date = h?.datetime || ''
              const amount = Number(h?.value ?? 0)
              const enemyPhoto = h?.photo_url_enemy || 'https://placehold.co/33x33'
              const enemyName = h?.username_enemy || 'Opponent'
              return (
                <div key={i} className={`w-full p-3 bg-black rounded-xl border ${win ? 'border-green-500' : 'border-red-700'} flex justify-between items-end overflow-hidden`}>
                  <div className="inline-flex flex-col justify-end gap-1">
                    <div className="inline-flex items-center gap-1">
                      <img className="w-8 h-8 rounded-lg object-cover" src={enemyPhoto} alt="opponent" referrerPolicy="no-referrer" />
                      <div className="inline-flex flex-col justify-center gap-0.5">
                        <div className="text-white text-sm font-light font-sans [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">{enemyName}</div>
                        <div className="text-zinc-100/25 text-[10px] font-light font-sans [text-shadow:_0px_1px_25px_rgb(0_0_0_/_0.25)]">{date}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 bg-neutral-800 rounded-[10px]">
                    <div className="inline-flex items-center gap-1">
                      <div className={`${win ? 'text-green-500' : 'text-red-700'} text-sm font-semibold font-sans`}>{win ? '+' : '-'}{amount.toFixed(2)}</div>
                      <img src={TonSvg} alt="TON" className="w-4 h-4 object-contain" />
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-white/40 text-xs">{loading ? 'Загрузка…' : 'Нет истории игр'}</div>
          )}
        </div>
    </div>
  </section>

      <div className="h-2" />
    </div>
  )
}
