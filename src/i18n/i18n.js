import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Inline resources are loaded synchronously to avoid async loader setup.
// If the app grows, switch to lazy-loaded JSON files.
import enCommon from '../locales/en/common.json'
import ruCommon from '../locales/ru/common.json'

const resources = {
  en: { common: enCommon },
  ru: { common: ruCommon },
}

// Initialize i18next
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: ['en', 'ru'],
      defaultNS: 'common',
      ns: ['common'],
      interpolation: { escapeValue: false },
      detection: {
        // We'll also try to sync with Telegram language via I18nProvider
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
    })
}

export default i18n
