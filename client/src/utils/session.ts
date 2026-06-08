export interface GameSession {
  roomCode: string
  playerId: string
  playerName: string
}

const SESSION_KEY = 'historical-geoguessr-session'

export function saveSession(session: GameSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): GameSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as GameSession
    if (!session.roomCode || !session.playerId || !session.playerName) {
      return null
    }
    return {
      roomCode: session.roomCode.toUpperCase(),
      playerId: session.playerId,
      playerName: session.playerName,
    }
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getRoomCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase()
  return code && code.length === 4 ? code : null
}

export function updateRoomUrl(roomCode: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomCode.toUpperCase())
  history.replaceState({}, '', url)
}

export function getShareableRoomUrl(roomCode: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('room', roomCode.toUpperCase())
  return url.toString()
}
