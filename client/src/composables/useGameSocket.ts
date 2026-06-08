import { reactive, ref } from 'vue'
import type {
  ClientMessage,
  ErrorCode,
  GameOverPayload,
  RevealStatePayload,
  RoomState,
  RoundEndPayload,
  RoundStartPayload,
  ServerMessage,
} from '@shared/types'
import { getWsUrl } from '../config'
import {
  clearSession,
  loadSession,
  saveSession,
  updateRoomUrl,
  type GameSession,
} from '../utils/session'

export type GameScreen = 'home' | 'lobby' | 'game' | 'reveal' | 'gameover'

const state = reactive({
  screen: 'home' as GameScreen,
  room: null as RoomState | null,
  round: null as RoundStartPayload | null,
  remainingMs: 0,
  roundResult: null as RoundEndPayload | null,
  revealState: null as RevealStatePayload | null,
  gameOver: null as GameOverPayload | null,
  error: null as ErrorCode | null,
})

let socket: WebSocket | null = null
const connected = ref(false)
let pendingRejoin: GameSession | null = null

const REJOIN_ERRORS: ErrorCode[] = ['PLAYER_NOT_FOUND', 'ROOM_NOT_FOUND', 'NAME_MISMATCH']

function send(message: ClientMessage) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

function persistSession(room: RoomState) {
  const self = room.players.find((player) => player.id === room.playerId)
  if (!self) return

  saveSession({
    roomCode: room.code,
    playerId: room.playerId,
    playerName: self.name,
  })
  updateRoomUrl(room.code)
}

function handleMessage(raw: MessageEvent) {
  const message = JSON.parse(raw.data as string) as ServerMessage

  switch (message.type) {
    case 'room_state':
      state.room = message.state
      persistSession(message.state)
      state.error = null
      if (message.state.status === 'lobby') {
        state.screen = 'lobby'
      }
      break
    case 'round_start':
      state.round = message.payload
      state.roundResult = null
      state.revealState = null
      state.remainingMs = Math.max(0, message.payload.endsAt - Date.now())
      state.screen = 'game'
      break
    case 'round_tick':
      state.remainingMs = message.remainingMs
      break
    case 'round_end':
      state.roundResult = message.payload
      state.revealState = null
      state.screen = 'reveal'
      break
    case 'reveal_state':
      state.revealState = message.payload
      break
    case 'game_over':
      state.gameOver = message.payload
      state.revealState = null
      state.screen = 'gameover'
      break
    case 'error':
      state.error = message.code
      if (REJOIN_ERRORS.includes(message.code)) {
        clearSession()
      }
      break
  }
}

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  socket = new WebSocket(getWsUrl())

  socket.onopen = () => {
    connected.value = true
    state.error = null

    if (pendingRejoin) {
      send({
        type: 'rejoin_room',
        code: pendingRejoin.roomCode,
        playerId: pendingRejoin.playerId,
        playerName: pendingRejoin.playerName,
      })
      pendingRejoin = null
    }
  }

  socket.onclose = () => {
    connected.value = false
  }

  socket.onerror = () => {
    state.error = 'CONNECTION_FAILED'
  }

  socket.onmessage = handleMessage
}

function disconnect() {
  socket?.close()
  socket = null
  connected.value = false
  pendingRejoin = null
}

function resetToHome() {
  clearSession()
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  history.replaceState({}, '', url)

  state.screen = 'home'
  state.room = null
  state.round = null
  state.roundResult = null
  state.revealState = null
  state.gameOver = null
  state.remainingMs = 0
  state.error = null
}

function setError(code: ErrorCode) {
  state.error = code
}

function tryAutoRejoin(): boolean {
  const session = loadSession()
  if (!session) return false

  pendingRejoin = session
  connect()
  return true
}

export function useGameSocket() {
  return {
    state,
    connected,
    connect,
    disconnect,
    resetToHome,
    setError,
    tryAutoRejoin,
    loadSession,
    createRoom: (playerName: string) => {
      connect()
      send({ type: 'create_room', playerName })
    },
    joinRoom: (code: string, playerName: string) => {
      connect()
      send({ type: 'join_room', code: code.toUpperCase(), playerName })
    },
    rejoinRoom: (session: GameSession) => {
      pendingRejoin = session
      connect()
    },
    setReady: (ready: boolean) => send({ type: 'set_ready', ready }),
    startGame: () => send({ type: 'start_game' }),
    submitGuess: (year: number, lat: number, lng: number) =>
      send({ type: 'submit_guess', year, lat, lng }),
    continueReveal: () => send({ type: 'continue_reveal' }),
  }
}
