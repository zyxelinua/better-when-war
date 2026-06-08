import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
}

interface StaticServerOptions {
  staticDir: string
  panoramsDir: string
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function isInsideRoot(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(target)
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
}

function contentType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

async function serveFile(res: ServerResponse, filePath: string) {
  const fileStat = await stat(filePath)
  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Content-Length': fileStat.size,
    'Cache-Control': filePath.includes(`${path.sep}assets${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600',
  })
  createReadStream(filePath).pipe(res)
}

async function tryServeStatic(res: ServerResponse, staticDir: string, pathname: string) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const filePath = path.join(staticDir, relativePath)

  if (!isInsideRoot(staticDir, filePath) || !(await fileExists(filePath))) {
    return false
  }

  const fileStat = await stat(filePath)
  if (!fileStat.isFile()) {
    return false
  }

  await serveFile(res, filePath)
  return true
}

export function createStaticHandler(options: StaticServerOptions) {
  const staticRoot = path.resolve(options.staticDir)
  const panoramsRoot = path.resolve(options.panoramsDir)

  return async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url || req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end()
      return
    }

    const url = new URL(req.url, 'http://local')
    const pathname = decodeURIComponent(url.pathname)

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('ok')
      return
    }

    if (pathname.startsWith('/panorams/')) {
      const filename = path.basename(pathname)
      if (!filename.endsWith('.webp')) {
        res.writeHead(404).end()
        return
      }

      const filePath = path.join(panoramsRoot, filename)
      if (!isInsideRoot(panoramsRoot, filePath) || !(await fileExists(filePath))) {
        res.writeHead(404).end()
        return
      }

      if (req.method === 'HEAD') {
        const fileStat = await stat(filePath)
        res.writeHead(200, {
          'Content-Type': 'image/webp',
          'Content-Length': fileStat.size,
        })
        res.end()
        return
      }

      await serveFile(res, filePath)
      return
    }

    if (await fileExists(staticRoot)) {
      if (await tryServeStatic(res, staticRoot, pathname)) {
        return
      }

      if (!path.extname(pathname)) {
        const indexPath = path.join(staticRoot, 'index.html')
        if (await fileExists(indexPath)) {
          if (req.method === 'HEAD') {
            const fileStat = await stat(indexPath)
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Content-Length': fileStat.size,
            })
            res.end()
            return
          }

          await serveFile(res, indexPath)
          return
        }
      }
    }

    res.writeHead(404).end()
  }
}
