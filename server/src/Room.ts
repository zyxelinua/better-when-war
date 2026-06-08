import { randomBytes } from 'node:crypto'
import type { WebSocket } from 'ws'
import type {
  ClientMessage,
  ErrorCode,
  Guess,
  Panorama,
  Player,
  PlayerRoundResult,
  RoomState,
  RoundEndPayload,
  RoundStartPayload,
  ServerMessage,
} from '../../shared/types.js'
import {
  DEFAULT_ROUND_DURATION_MS,
  DEFAULT_TOTAL_ROUNDS,
  MAX_PLAYERS,
} from '../../shared/types.js'
import {
  getYearDiff,
  haversineDistance,
  scoreLocation,
  scoreYear,
  totalRoundScore,
} from '../../shared/scoring.js'
import { REVEAL_MAX_MS, ROUND_DURATION_MS, TOTAL_ROUNDS } from './config.js'
import { toRoundRevealInfo } from './reveal.js'

interface RoomPlayer {
  id: string
  name: string
  score: number
  colorIndex: number
  ready: boolean
  socket: WebSocket
  guess?: Guess
}

function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = randomBytes(4)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export class Room {
  readonly code: string
  readonly hostId: string
  readonly totalRounds: number

  private players = new Map<string, RoomPlayer>()
  private status: RoomState['status'] = 'lobby'
  private currentRound = 0
  private roundPanoramas: Panorama[] = []
  private roundEndsAt = 0
  private roundTimer: NodeJS.Timeout | null = null
  private tickTimer: NodeJS.Timeout | null = null
  private revealTimer: NodeJS.Timeout | null = null
  private revealContinued = new Set<string>()
  private lastRoundEnd: RoundEndPayload | null = null
  private lastGameOver: { players: { id: string; name: string; score: number }[] } | null = null

  constructor(hostId: string, hostName: string, hostSocket: WebSocket, panoramas: Panorama[]) {
    this.code = createRoomCode()
    this.hostId = hostId
    this.totalRounds = TOTAL_ROUNDS || DEFAULT_TOTAL_ROUNDS
    this.roundPanoramas = shuffle(panoramas).slice(0, this.totalRounds)
    this.addPlayer(hostId, hostName, hostSocket, true)
    this.broadcastRoomState()
  }

  get playerCount(): number {
    return this.players.size
  }

  private allocateColorIndex(): number {
    const used = new Set([...this.players.values()].map((player) => player.colorIndex))
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      if (!used.has(index)) return index
    }
    return 0
  }

  private addPlayer(id: string, name: string, socket: WebSocket, autoReady = false) {
    this.players.set(id, {
      id,
      name,
      score: 0,
      colorIndex: this.allocateColorIndex(),
      ready: autoReady,
      socket,
    })
  }

  private broadcast(message: ServerMessage, targetSocket?: WebSocket) {
    const payload = JSON.stringify(message)
    for (const player of this.players.values()) {
      if (player.socket.readyState === player.socket.OPEN) {
        if (!targetSocket || targetSocket === player.socket) {
          player.socket.send(payload)
        }
      }
    }
  }

  private sendError(socket: WebSocket, code: ErrorCode) {
    const payload: ServerMessage = { type: 'error', code }
    socket.send(JSON.stringify(payload))
  }

  private sendToPlayer(playerId: string, message: ServerMessage) {
    const player = this.players.get(playerId)
    if (!player || player.socket.readyState !== player.socket.OPEN) return
    player.socket.send(JSON.stringify(message))
  }

  private toRoomState(playerId: string): RoomState {
    const players: Player[] = [...this.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      colorIndex: player.colorIndex,
      ready: player.ready,
      connected: player.socket.readyState === player.socket.OPEN,
      hasGuessed: Boolean(player.guess),
    }))

    return {
      code: this.code,
      hostId: this.hostId,
      players,
      status: this.status,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      playerId,
    }
  }

  private broadcastRoomState() {
    for (const player of this.players.values()) {
      this.broadcast(
        { type: 'room_state', state: this.toRoomState(player.id) },
        player.socket,
      )
    }
  }

  join(playerId: string, playerName: string, socket: WebSocket): boolean {
    if (this.status !== 'lobby') {
      this.sendError(socket, 'GAME_ALREADY_STARTED')
      return false
    }

    if (this.players.size >= MAX_PLAYERS) {
      this.sendError(socket, 'ROOM_FULL')
      return false
    }

    this.addPlayer(playerId, playerName, socket)
    this.broadcastRoomState()
    return true
  }

  rejoin(playerId: string, playerName: string, socket: WebSocket): boolean {
    const player = this.players.get(playerId)
    if (!player) {
      this.sendError(socket, 'PLAYER_NOT_FOUND')
      return false
    }

    if (player.name !== playerName) {
      this.sendError(socket, 'NAME_MISMATCH')
      return false
    }

    player.socket = socket
    this.syncPlayer(playerId)
    this.broadcastRoomState()

    if (this.status === 'reveal') {
      this.tryProceedFromReveal()
    } else if (this.status === 'playing') {
      this.tryFinishRound()
    }

    return true
  }

  private syncPlayer(playerId: string) {
    this.sendToPlayer(playerId, { type: 'room_state', state: this.toRoomState(playerId) })

    if (this.status === 'playing') {
      const panorama = this.roundPanoramas[this.currentRound]
      if (panorama) {
        const payload: RoundStartPayload = {
          roundIndex: this.currentRound,
          totalRounds: this.totalRounds,
          panoramaId: panorama.id,
          image: panorama.image,
          endsAt: this.roundEndsAt,
        }
        this.sendToPlayer(playerId, { type: 'round_start', payload })
        this.sendToPlayer(playerId, {
          type: 'round_tick',
          remainingMs: Math.max(0, this.roundEndsAt - Date.now()),
        })
      }
    } else if (this.status === 'reveal' && this.lastRoundEnd) {
      this.sendToPlayer(playerId, { type: 'round_end', payload: this.lastRoundEnd })
      this.sendRevealStateToPlayer(playerId)
    } else if (this.status === 'finished' && this.lastGameOver) {
      this.sendToPlayer(playerId, { type: 'game_over', payload: this.lastGameOver })
    }
  }

  private sendRevealStateToPlayer(playerId: string) {
    const activePlayers = this.getActivePlayers()
    const continuedPlayerIds = activePlayers
      .map((player) => player.id)
      .filter((id) => this.revealContinued.has(id))

    const waitingPlayers = activePlayers
      .filter((player) => !this.revealContinued.has(player.id))
      .map((player) => ({
        id: player.id,
        name: player.name,
        colorIndex: player.colorIndex,
      }))

    this.sendToPlayer(playerId, {
      type: 'reveal_state',
      payload: {
        continuedPlayerIds,
        waitingCount: waitingPlayers.length,
        waitingPlayers,
      },
    })
  }

  handleDisconnect(playerId: string, socket: WebSocket) {
    const player = this.players.get(playerId)
    if (!player || player.socket !== socket) return

    if (this.status === 'lobby') {
      this.broadcastRoomState()
      return 'lobby'
    }

    this.broadcastRoomState()
    if (this.status === 'reveal') {
      this.tryProceedFromReveal()
    } else {
      this.tryFinishRound()
    }
    return 'playing'
  }

  isAbandoned(): boolean {
    return this.getActivePlayers().length === 0
  }

  handleMessage(playerId: string, message: ClientMessage) {
    switch (message.type) {
      case 'set_ready':
        this.setReady(playerId, message.ready)
        break
      case 'start_game':
        this.startGame(playerId)
        break
      case 'submit_guess':
        this.submitGuess(playerId, {
          year: message.year,
          lat: message.lat,
          lng: message.lng,
        })
        break
      case 'continue_reveal':
        this.continueReveal(playerId)
        break
      default:
        break
    }
  }

  private setReady(playerId: string, ready: boolean) {
    if (this.status !== 'lobby') return
    const player = this.players.get(playerId)
    if (!player) return
    player.ready = ready
    this.broadcastRoomState()
  }

  private startGame(playerId: string) {
    if (playerId !== this.hostId) {
      const host = this.players.get(playerId)
      if (host) this.sendError(host.socket, 'HOST_ONLY')
      return
    }

    if (this.status !== 'lobby') return

    const allReady = [...this.players.values()].every((player) => player.ready)
    if (!allReady) {
      const host = this.players.get(playerId)
      if (host) this.sendError(host.socket, 'NOT_ALL_READY')
      return
    }

    if (this.roundPanoramas.length === 0) {
      const host = this.players.get(playerId)
      if (host) this.sendError(host.socket, 'NO_PANORAMAS')
      return
    }

    this.status = 'playing'
    this.currentRound = 0
    this.startRound()
  }

  private startRound() {
    this.clearTimers()

    for (const player of this.players.values()) {
      player.guess = undefined
    }

    const panorama = this.roundPanoramas[this.currentRound]
    if (!panorama) {
      this.finishGame()
      return
    }

    const duration = ROUND_DURATION_MS || DEFAULT_ROUND_DURATION_MS
    this.roundEndsAt = Date.now() + duration

    const payload: RoundStartPayload = {
      roundIndex: this.currentRound,
      totalRounds: this.totalRounds,
      panoramaId: panorama.id,
      image: panorama.image,
      endsAt: this.roundEndsAt,
    }

    this.broadcast({ type: 'round_start', payload })

    this.tickTimer = setInterval(() => {
      const remainingMs = Math.max(0, this.roundEndsAt - Date.now())
      this.broadcast({ type: 'round_tick', remainingMs })
      if (remainingMs <= 0 && this.tickTimer) {
        clearInterval(this.tickTimer)
        this.tickTimer = null
      }
    }, 250)

    this.roundTimer = setTimeout(() => this.finishRound(), duration)
  }

  private submitGuess(playerId: string, guess: Guess) {
    if (this.status !== 'playing') return
    const player = this.players.get(playerId)
    if (!player || player.guess) return

    player.guess = guess
    this.broadcastRoomState()
    this.tryFinishRound()
  }

  private tryFinishRound() {
    if (this.status !== 'playing') return

    const activePlayers = [...this.players.values()].filter(
      (player) => player.socket.readyState === player.socket.OPEN,
    )

    if (activePlayers.length === 0) return

    const allGuessed = activePlayers.every((player) => player.guess)
    if (allGuessed) {
      this.finishRound()
    }
  }

  private finishRound() {
    if (this.status !== 'playing') return

    this.clearTimers()
    this.status = 'reveal'

    const panorama = this.roundPanoramas[this.currentRound]
    if (!panorama) {
      this.finishGame()
      return
    }

    const results: PlayerRoundResult[] = [...this.players.values()].map((player) => {
      if (!player.guess) {
        return {
          playerId: player.id,
          playerName: player.name,
          yearScore: 0,
          locationScore: 0,
          totalScore: 0,
          distanceMeters: 0,
          yearDiff: 0,
        }
      }

      const yearScore = scoreYear(player.guess.year, panorama.year)
      const locationScore = scoreLocation(
        player.guess.lat,
        player.guess.lng,
        panorama.location.lat,
        panorama.location.lng,
      )
      const roundScore = totalRoundScore(yearScore, locationScore)
      player.score += roundScore

      return {
        playerId: player.id,
        playerName: player.name,
        guess: player.guess,
        yearScore,
        locationScore,
        totalScore: roundScore,
        distanceMeters: haversineDistance(
          player.guess.lat,
          player.guess.lng,
          panorama.location.lat,
          panorama.location.lng,
        ),
        yearDiff: getYearDiff(player.guess.year, panorama.year),
      }
    })

    this.revealContinued.clear()

    const payload: RoundEndPayload = {
      roundIndex: this.currentRound,
      reveal: toRoundRevealInfo(panorama),
      results,
    }

    this.lastRoundEnd = payload
    this.broadcast({ type: 'round_end', payload })
    this.broadcastRevealState()
    this.broadcastRoomState()

    this.revealTimer = setTimeout(() => this.proceedFromReveal(), REVEAL_MAX_MS)
  }

  private getActivePlayers(): RoomPlayer[] {
    return [...this.players.values()].filter(
      (player) => player.socket.readyState === player.socket.OPEN,
    )
  }

  private broadcastRevealState() {
    const activePlayers = this.getActivePlayers()
    const continuedPlayerIds = activePlayers
      .map((player) => player.id)
      .filter((id) => this.revealContinued.has(id))

    const waitingPlayers = activePlayers
      .filter((player) => !this.revealContinued.has(player.id))
      .map((player) => ({
        id: player.id,
        name: player.name,
        colorIndex: player.colorIndex,
      }))

    this.broadcast({
      type: 'reveal_state',
      payload: {
        continuedPlayerIds,
        waitingCount: waitingPlayers.length,
        waitingPlayers,
      },
    })
  }

  private continueReveal(playerId: string) {
    if (this.status !== 'reveal') return
    const player = this.players.get(playerId)
    if (!player) return

    this.revealContinued.add(playerId)
    this.broadcastRevealState()
    this.tryProceedFromReveal()
  }

  private tryProceedFromReveal() {
    if (this.status !== 'reveal') return

    const activePlayers = this.getActivePlayers()
    if (activePlayers.length === 0) return

    const allContinued = activePlayers.every((player) => this.revealContinued.has(player.id))
    if (allContinued) {
      this.proceedFromReveal()
    }
  }

  private proceedFromReveal() {
    if (this.status !== 'reveal') return

    if (this.revealTimer) {
      clearTimeout(this.revealTimer)
      this.revealTimer = null
    }

    this.revealContinued.clear()
    this.currentRound += 1

    if (this.currentRound >= this.totalRounds) {
      this.finishGame()
      return
    }

    this.status = 'playing'
    this.startRound()
  }

  private finishGame() {
    this.clearTimers()
    this.status = 'finished'

    const payload = {
      players: [...this.players.values()]
        .map((player) => ({
          id: player.id,
          name: player.name,
          score: player.score,
        }))
        .sort((a, b) => b.score - a.score),
    }

    this.lastGameOver = payload
    this.broadcast({ type: 'game_over', payload })
    this.broadcastRoomState()
  }

  private clearTimers() {
    if (this.roundTimer) clearTimeout(this.roundTimer)
    if (this.tickTimer) clearInterval(this.tickTimer)
    if (this.revealTimer) clearTimeout(this.revealTimer)
    this.roundTimer = null
    this.tickTimer = null
    this.revealTimer = null
  }
}
