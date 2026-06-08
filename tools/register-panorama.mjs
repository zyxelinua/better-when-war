#!/usr/bin/env node
/**
 * Register a new panorama with an opaque id.
 *
 * Usage:
 *   node tools/register-panorama.mjs path/to/photo.webp
 *   node tools/register-panorama.mjs path/to/photo.webp --id a1f84e20
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const serverPanoramsDir = path.join(root, 'server/data/panorams')
const serverJsonPath = path.join(root, 'server/data/panoramas.json')

function generateId() {
  return randomBytes(4).toString('hex')
}

function buildEntry(id) {
  return {
    id,
    image: `/panorams/${id}.webp`,
    title: { ru: 'Новое событие', en: 'New event' },
    year: 1900,
    date: '1900-01-01',
    place: { ru: 'Укажите место', en: 'Specify location' },
    location: { lat: 0, lng: 0 },
    wikipedia: {
      ru: 'https://ru.wikipedia.org/wiki/%D0%9E%D1%82%D0%B5%D1%87%D0%B5%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0_1812_%D0%B3%D0%BE%D0%B4%D0%B0',
      en: 'https://en.wikipedia.org/wiki/French_invasion_of_Russia',
    },
    difficulty: 'medium',
    epoch: 'modern',
    eventType: 'battle',
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

async function main() {
  const args = process.argv.slice(2)
  const idFlagIndex = args.indexOf('--id')
  const customId = idFlagIndex !== -1 ? args[idFlagIndex + 1] : null
  const sourcePath = args.find((arg) => !arg.startsWith('--') && arg !== customId)

  if (!sourcePath) {
    console.error('Usage: node tools/register-panorama.mjs <image.webp> [--id opaqueId]')
    process.exit(1)
  }

  const absoluteSource = path.resolve(sourcePath)
  const id = customId ?? generateId()
  const targetName = `${id}.webp`

  await mkdir(serverPanoramsDir, { recursive: true })

  const serverTarget = path.join(serverPanoramsDir, targetName)

  await copyFile(absoluteSource, serverTarget)

  const entry = buildEntry(id)
  const serverData = await readJson(serverJsonPath)

  if (serverData.some((item) => item.id === id)) {
    console.error(`Panorama id "${id}" already exists in panoramas.json`)
    process.exit(1)
  }

  serverData.push(entry)
  await writeJson(serverJsonPath, serverData)

  console.log(`Registered panorama "${id}"`)
  console.log(`  image: ${serverTarget}`)
  console.log('Edit metadata in server/data/panoramas.json, then run: npm run sync-panoramas')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
