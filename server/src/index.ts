import { GameServer } from './GameServer.js'

const server = new GameServer()

try {
  await server.init()
  server.start()
} catch (error) {
  console.error('Failed to start game server:', error)
  process.exit(1)
}
