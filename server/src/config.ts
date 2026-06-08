import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverSrcDir = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.resolve(serverSrcDir, '..')
const repoRoot = path.resolve(serverDir, '..')

export const PORT = Number(process.env.PORT ?? 3001)
export const PANORAMAS_URL = process.env.PANORAMAS_URL ?? ''
export const PANORAMAS_FILE = process.env.PANORAMAS_FILE ?? ''
export const ROUND_DURATION_MS = Number(process.env.ROUND_DURATION_MS ?? 60_000)
export const TOTAL_ROUNDS = Number(process.env.TOTAL_ROUNDS ?? 5)
export const REVEAL_MAX_MS = Number(process.env.REVEAL_MAX_MS ?? 60_000)
export const CLIENT_DIST_DIR = process.env.CLIENT_DIST_DIR ?? path.join(repoRoot, 'client/dist')
export const PANORAMS_DIR = process.env.PANORAMS_DIR ?? path.join(serverDir, 'data/panorams')
