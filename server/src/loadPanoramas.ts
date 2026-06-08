import { access } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Panorama } from '../../shared/types.js'
import { PANORAMAS_FILE, PANORAMAS_URL } from './config.js'

const defaultPanoramasFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../data/panoramas.json',
)
function imageBasename(image: string): string {
  return path.basename(image)
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function filterExistingPanoramas(
  panoramas: Panorama[],
  panoramsDir: string,
): Promise<Panorama[]> {
  const valid: Panorama[] = []

  for (const panorama of panoramas) {
    if (panorama.image.startsWith('http://') || panorama.image.startsWith('https://')) {
      valid.push(panorama)
      continue
    }

    const filePath = path.join(panoramsDir, imageBasename(panorama.image))
    if (await fileExists(filePath)) {
      valid.push(panorama)
    } else {
      console.warn(`Skipping panorama "${panorama.id}": missing file ${filePath}`)
    }
  }

  return valid
}

async function loadFromFile(filePath: string): Promise<Panorama[]> {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw) as Panorama[]
}

async function loadFromUrl(url: string): Promise<Panorama[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return (await response.json()) as Panorama[]
}

export async function loadPanoramas(): Promise<Panorama[]> {
  const panoramsDir = path.join(path.dirname(defaultPanoramasFile), 'panorams')
  let panoramas: Panorama[] = []

  if (PANORAMAS_URL) {
    try {
      panoramas = await loadFromUrl(PANORAMAS_URL)
    } catch (error) {
      console.warn(`Failed to load panoramas from URL (${PANORAMAS_URL}), using local file`)
      console.warn(error)
    }
  }

  if (panoramas.length === 0) {
    const filePath = PANORAMAS_FILE || defaultPanoramasFile
    panoramas = await loadFromFile(filePath)
  }

  return filterExistingPanoramas(panoramas, panoramsDir)
}
