import { createI18n } from 'vue-i18n'
import type { AppLocale } from '@shared/types'
import en from './locales/en'
import ru from './locales/ru'

const messages = { ru, en }

function detectLocale(): AppLocale {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]

  for (const language of languages) {
    const normalized = language.toLowerCase()
    if (normalized.startsWith('ru')) {
      return 'ru'
    }
  }

  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages,
})

export function useAppLocale() {
  return i18n.global.locale
}
