import type { PanoramaEpoch, PanoramaEventType } from './panoramaMeta.js'

export type AppLocale = 'ru' | 'en'

export type LocalizedText = string | Partial<Record<AppLocale, string>>

export type { PanoramaEpoch, PanoramaEventType } from './panoramaMeta.js'

export interface PanoramaLocation {
  lat: number
  lng: number
}

/** Full panorama — server-side only, never sent to clients in bulk */
export interface Panorama {
  id: string
  title: LocalizedText
  year: number
  /** ISO date: YYYY-MM-DD — formatted in UI via Intl */
  date: string
  place: LocalizedText
  location: PanoramaLocation
  image: string
  wikipedia?: Partial<Record<AppLocale, string>>
  difficulty?: 'easy' | 'medium' | 'hard'
  epoch: PanoramaEpoch
  eventType: PanoramaEventType
}

/** Public reveal info after a round — safe to send */
export interface RoundRevealInfo {
  title: LocalizedText
  year: number
  date: string
  place: LocalizedText
  location: PanoramaLocation
  wikipedia?: Partial<Record<AppLocale, string>>
  epoch: PanoramaEpoch
  eventType: PanoramaEventType
}

export type ErrorCode =
  | 'INVALID_MESSAGE'
  | 'PLAYER_NAME_REQUIRED'
  | 'ROOM_NOT_FOUND'
  | 'GAME_ALREADY_STARTED'
  | 'ROOM_FULL'
  | 'HOST_ONLY'
  | 'NOT_ALL_READY'
  | 'NO_PANORAMAS'
  | 'CONNECTION_FAILED'
  | 'NAME_REQUIRED'
  | 'ROOM_CODE_REQUIRED'
  | 'PLAYER_NOT_FOUND'
  | 'NAME_MISMATCH'

export interface Player {
  id: string
  name: string
  score: number
  colorIndex: number
  ready: boolean
  connected: boolean
  hasGuessed?: boolean
}

export type RoomStatus = 'lobby' | 'playing' | 'reveal' | 'finished'

export interface RoomState {
  code: string
  hostId: string
  players: Player[]
  status: RoomStatus
  currentRound: number
  totalRounds: number
  playerId: string
}

export interface RoundStartPayload {
  roundIndex: number
  totalRounds: number
  panoramaId: string
  image: string
  endsAt: number
}

export interface Guess {
  year: number
  lat: number
  lng: number
}

export interface PlayerRoundResult {
  playerId: string
  playerName: string
  guess?: Guess
  yearScore: number
  locationScore: number
  totalScore: number
  distanceMeters: number
  yearDiff: number
}

export interface RoundEndPayload {
  roundIndex: number
  reveal: RoundRevealInfo
  results: PlayerRoundResult[]
}

export interface RevealWaitingPlayer {
  id: string
  name: string
  colorIndex: number
}

export interface RevealStatePayload {
  continuedPlayerIds: string[]
  waitingCount: number
  waitingPlayers: RevealWaitingPlayer[]
}

export interface GameOverPayload {
  players: Array<{ id: string; name: string; score: number }>
}

export type ClientMessage =
  | { type: 'create_room'; playerName: string }
  | { type: 'join_room'; code: string; playerName: string }
  | { type: 'rejoin_room'; code: string; playerId: string; playerName: string }
  | { type: 'set_ready'; ready: boolean }
  | { type: 'start_game' }
  | { type: 'submit_guess'; year: number; lat: number; lng: number }
  | { type: 'continue_reveal' }

export type ServerMessage =
  | { type: 'room_state'; state: RoomState }
  | { type: 'round_start'; payload: RoundStartPayload }
  | { type: 'round_tick'; remainingMs: number }
  | { type: 'round_end'; payload: RoundEndPayload }
  | { type: 'reveal_state'; payload: RevealStatePayload }
  | { type: 'game_over'; payload: GameOverPayload }
  | { type: 'error'; code: ErrorCode }

export const DEFAULT_ROUND_DURATION_MS = 60_000
export const DEFAULT_TOTAL_ROUNDS = 5
export const DEFAULT_REVEAL_AUTO_MS = 10_000
export const DEFAULT_REVEAL_MAX_MS = 60_000
export const MAX_PLAYERS = 4
