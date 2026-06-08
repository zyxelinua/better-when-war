import { randomUUID } from 'node:crypto'
import { createServer, type Server as HttpServer } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import type { ClientMessage, Panorama } from '../../shared/types.js'
import { access } from 'node:fs/promises'
import { CLIENT_DIST_DIR, PANORAMS_DIR, PORT } from './config.js'
import { loadPanoramas } from './loadPanoramas.js'
import { Room } from './Room.js'
import { createStaticHandler } from './staticServer.js'

interface ClientContext {
  playerId: string
  roomCode?: string
}

export class GameServer {
  private httpServer: HttpServer
  private wss: WebSocketServer
  private rooms = new Map<string, Room>()
  private clientRooms = new Map<WebSocket, ClientContext>()
  private panoramas: Panorama[] = []

  constructor() {
    const handleHttp = createStaticHandler({
      staticDir: CLIENT_DIST_DIR,
      panoramsDir: PANORAMS_DIR,
    })

    this.httpServer = createServer((req, res) => {
      void handleHttp(req, res)
    })

    this.wss = new WebSocketServer({ server: this.httpServer })
    this.wss.on('connection', (socket) => this.onConnection(socket))
  }

  async init() {
    this.panoramas = await loadPanoramas()
    console.log(`Loaded ${this.panoramas.length} panoramas`)

    try {
      await access(CLIENT_DIST_DIR)
      console.log(`Serving client from ${CLIENT_DIST_DIR}`)
    } catch {
      console.warn(`Client build not found at ${CLIENT_DIST_DIR} — run: npm run build:client`)
    }

    console.log(`Serving panoramas from ${PANORAMS_DIR}`)
  }

  start() {
    this.httpServer.listen(PORT, () => {
      console.log(`App listening on http://localhost:${PORT}`)
    })
  }

  private onConnection(socket: WebSocket) {
    const playerId = randomUUID()
    this.clientRooms.set(socket, { playerId })

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as ClientMessage
        this.handleMessage(socket, message)
      } catch {
        socket.send(JSON.stringify({ type: 'error', code: 'INVALID_MESSAGE' }))
      }
    })

    socket.on('close', () => this.handleDisconnect(socket))
  }

  private handleMessage(socket: WebSocket, message: ClientMessage) {
    const context = this.clientRooms.get(socket)
    if (!context) return

    if (message.type === 'create_room') {
      const name = message.playerName.trim()
      if (!name) {
        socket.send(JSON.stringify({ type: 'error', code: 'PLAYER_NAME_REQUIRED' }))
        return
      }

      const room = new Room(context.playerId, name, socket, this.panoramas)
      this.rooms.set(room.code, room)
      context.roomCode = room.code
      return
    }

    if (message.type === 'join_room') {
      const name = message.playerName.trim()
      const code = message.code.trim().toUpperCase()
      if (!name) {
        socket.send(JSON.stringify({ type: 'error', code: 'PLAYER_NAME_REQUIRED' }))
        return
      }

      const room = this.rooms.get(code)
      if (!room) {
        socket.send(JSON.stringify({ type: 'error', code: 'ROOM_NOT_FOUND' }))
        return
      }

      const joined = room.join(context.playerId, name, socket)
      if (joined) {
        context.roomCode = code
      }
      return
    }

    if (message.type === 'rejoin_room') {
      const name = message.playerName.trim()
      const code = message.code.trim().toUpperCase()
      if (!name) {
        socket.send(JSON.stringify({ type: 'error', code: 'PLAYER_NAME_REQUIRED' }))
        return
      }

      const room = this.rooms.get(code)
      if (!room) {
        socket.send(JSON.stringify({ type: 'error', code: 'ROOM_NOT_FOUND' }))
        return
      }

      const rejoined = room.rejoin(message.playerId, name, socket)
      if (rejoined) {
        context.playerId = message.playerId
        context.roomCode = code
      }
      return
    }

    const roomCode = context.roomCode
    if (!roomCode) return

    const room = this.rooms.get(roomCode)
    room?.handleMessage(context.playerId, message)
  }

  private handleDisconnect(socket: WebSocket) {
    const context = this.clientRooms.get(socket)
    if (!context?.roomCode) {
      this.clientRooms.delete(socket)
      return
    }

    const room = this.rooms.get(context.roomCode)
    room?.handleDisconnect(context.playerId, socket)

    if (room?.isAbandoned()) {
      this.rooms.delete(context.roomCode)
    }

    this.clientRooms.delete(socket)
  }
}
