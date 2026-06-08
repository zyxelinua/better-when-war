import type { AppLocale } from './types.js'

export function parseWikipediaTitle(url: string): string | null {
  try {
    const parsed = new URL(url)
    const wikiIndex = parsed.pathname.indexOf('/wiki/')
    if (wikiIndex === -1) return null
    return decodeURIComponent(parsed.pathname.slice(wikiIndex + 6))
  } catch {
    return null
  }
}

export function getWikipediaHost(locale: AppLocale): string {
  return locale === 'ru' ? 'ru.wikipedia.org' : 'en.wikipedia.org'
}

export function getWikipediaHostFromUrl(articleUrl: string, fallbackLocale: AppLocale): string {
  try {
    const parsed = new URL(articleUrl)
    if (parsed.hostname.endsWith('wikipedia.org')) {
      return parsed.hostname
    }
  } catch {
    // ignore invalid urls
  }

  return getWikipediaHost(fallbackLocale)
}

export function buildWikipediaSummaryUrl(articleUrl: string, locale: AppLocale): string | null {
  const title = parseWikipediaTitle(articleUrl)
  if (!title) return null
  const host = getWikipediaHostFromUrl(articleUrl, locale)
  return `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`
}

export interface WikipediaSummary {
  title: string
  description?: string
  extract?: string
  thumbnailUrl?: string
  articleUrl: string
}

export async function fetchWikipediaSummary(
  articleUrl: string,
  locale: AppLocale,
): Promise<WikipediaSummary | null> {
  const apiUrl = buildWikipediaSummaryUrl(articleUrl, locale)
  if (!apiUrl) return null

  const response = await fetch(apiUrl)
  if (!response.ok) return null

  const data = (await response.json()) as {
    title?: string
    description?: string
    extract?: string
    thumbnail?: { source?: string }
  }

  return {
    title: data.title ?? '',
    description: data.description,
    extract: data.extract,
    thumbnailUrl: data.thumbnail?.source,
    articleUrl,
  }
}
