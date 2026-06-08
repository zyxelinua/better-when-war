import type { AppLocale, LocalizedText } from './types.js'

export function getLocalizedText(text: LocalizedText, locale: AppLocale): string {
  if (typeof text === 'string') {
    return text
  }

  return text[locale] ?? text.en ?? text.ru ?? ''
}
