import React, { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n/i18n'
import { useTelegram } from './TelegramProvider'

/**
 * I18nProvider wires i18next and syncs language with Telegram user when available.
 * Priority:
 * 1) Explicit user choice from localStorage (persisted by i18next detector)
 * 2) Telegram user.language_code (ru/en)
 * 3) Navigator language (handled by detector)
 */
export default function I18nProvider({ children }) {
  const { user } = useTelegram?.() || { user: null }

  useEffect(() => {
    if (!user?.language_code) return
    const lang = user.language_code.startsWith('ru') ? 'ru' : 'en'
    // Respect manual choice if it exists
    const manual = localStorage.getItem('i18nextLng')
    if (!manual) {
      i18n.changeLanguage(lang)
    }
  }, [user?.language_code])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
