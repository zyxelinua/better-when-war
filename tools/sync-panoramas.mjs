#!/usr/bin/env node

import { access, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const serverJson = path.join(root, 'server/data/panoramas.json')
const clientJson = path.join(root, 'client/public/data/panoramas.json')
const serverPanorams = path.join(root, 'server/data/panorams')

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function imageBasename(image) {
  return path.basename(image)
}

function cleanEntry(entry) {
  const cleaned = { ...entry }
  delete cleaned.dateLabel
  if (cleaned.wikipedia) {
    const wiki = {}
    for (const [locale, url] of Object.entries(cleaned.wikipedia)) {
      if (typeof url === 'string' && url.trim()) {
        wiki[locale] = url.trim()
      }
    }
    if (Object.keys(wiki).length > 0) {
      cleaned.wikipedia = wiki
    } else {
      delete cleaned.wikipedia
    }
  }
  return cleaned
}

async function prunePanoramas() {
  await mkdir(serverPanorams, { recursive: true })

  const raw = await readFile(serverJson, 'utf8')
  const entries = JSON.parse(raw)
  const kept = []
  const referencedFiles = new Set()

  for (const entry of entries) {
    const filename = imageBasename(entry.image)
    const filePath = path.join(serverPanorams, filename)
    if (await fileExists(filePath)) {
      kept.push(cleanEntry(entry))
      referencedFiles.add(filename)
    } else {
      console.warn(`Removed JSON entry "${entry.id}": missing ${filename}`)
    }
  }

  const diskFiles = (await readdir(serverPanorams)).filter((file) => file.endsWith('.webp'))
  for (const file of diskFiles) {
    if (!referencedFiles.has(file)) {
      await unlink(path.join(serverPanorams, file))
      console.warn(`Removed orphan image: ${file}`)
    }
  }

  await writeFile(serverJson, `${JSON.stringify(kept, null, 2)}\n`, 'utf8')
  return kept
}

async function removeClientPanoramasJson() {
  if (await fileExists(clientJson)) {
    await unlink(clientJson)
    console.log('Removed client/public/data/panoramas.json (answers must stay server-side)')
  }
}

async function main() {
  const entries = await prunePanoramas()
  await removeClientPanoramasJson()
  console.log(`Panoramas in pool: ${entries.length}`)
  console.log('Images live in server/data/panorams/ only')
  console.log('Metadata stays in server/data/panoramas.json only')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
