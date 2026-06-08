export function getWsUrl(): string {
  const env = import.meta.env.VITE_WS_URL?.trim()
  if (env) return env

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}`
  }

  return 'ws://localhost:3001'
}

export const ASSETS_BASE_URL = import.meta.env.VITE_ASSETS_BASE_URL ?? ''

export function resolvePanoramaImage(image: string): string {
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }
  const base = ASSETS_BASE_URL.replace(/\/$/, '')
  const path = image.startsWith('/') ? image : `/${image}`
  return `${base}${path}`
}
