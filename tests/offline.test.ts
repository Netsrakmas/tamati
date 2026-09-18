import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, it, expect } from 'vitest'
function worker() {
  const handlers: Record<string, (event: any) => void> = {}
  const data = new Map<string, unknown>()
  const deleted: string[] = []
  const fetched: string[] = []
  let skip = false,
    claimed = false
  const cache = {
    addAll: async (assets: string[]) => {
      assets.forEach((a) =>
        data.set(new URL(a, 'https://example.com/tamati/').href, { asset: a }),
      )
    },
    match: async (key: string | Request) =>
      data.get(typeof key === 'string' ? key : key.url),
  }
  const source = readFileSync(
    new URL('../public/sw.js', import.meta.url),
    'utf8',
  )
    .replace('__RELEASE__', 'test')
    .replace('__ASSETS__', JSON.stringify(['./', './app.js', './icon.svg']))
  runInNewContext(source, {
    URL,
    self: {
      location: new URL('https://example.com/tamati/sw.js'),
      addEventListener: (name: string, handler: (typeof handlers)[string]) =>
        (handlers[name] = handler),
      skipWaiting: () => {
        skip = true
      },
      clients: {
        claim: async () => {
          claimed = true
        },
      },
    },
    caches: {
      open: async () => cache,
      keys: async () => ['other-app-v1', 'tamati-old', 'tamati-test'],
      delete: async (k: string) => deleted.push(k),
    },
    fetch: async (req: Request) => {
      fetched.push(req.url)
      return { network: true }
    },
  })
  async function event(name: string, extra = {}) {
    let result: Promise<unknown> | undefined
    handlers[name]({
      waitUntil: (p: Promise<unknown>) => (result = p),
      respondWith: (p: Promise<unknown>) => (result = p),
      ...extra,
    })
    return result
  }
  return {
    event,
    data,
    deleted,
    fetched,
    get skip() {
      return skip
    },
    get claimed() {
      return claimed
    },
  }
}
describe('atomic offline releases', () => {
  it('precaches the complete release before activating', async () => {
    const w = worker()
    await w.event('install')
    expect(w.data.size).toBe(3)
    expect(w.skip).toBe(false)
  })
  it('cleans only Tamati caches, preserving other applications', async () => {
    const w = worker()
    await w.event('activate')
    expect(w.deleted).toEqual(['tamati-old'])
    expect(w.claimed).toBe(true)
  })
  it('serves query-string navigation from the installed release, without network', async () => {
    const w = worker()
    await w.event('install')
    const r = await w.event('fetch', {
      request: {
        method: 'GET',
        url: 'https://example.com/tamati/?fastforward=9h',
        mode: 'navigate',
      },
    })
    expect(r).toEqual({ asset: './' })
    expect(w.fetched).toHaveLength(0)
  })
  it('works offline for precached art and script assets', async () => {
    const w = worker()
    await w.event('install')
    const r = await w.event('fetch', {
      request: {
        method: 'GET',
        url: 'https://example.com/tamati/app.js',
        mode: 'cors',
      },
    })
    expect(r).toEqual({ asset: './app.js' })
    expect(w.fetched).toHaveLength(0)
  })
  it('does not intercept another origin or non-GET requests', async () => {
    const w = worker()
    expect(
      await w.event('fetch', {
        request: { method: 'GET', url: 'https://elsewhere.com/api' },
      }),
    ).toBeUndefined()
    expect(
      await w.event('fetch', {
        request: { method: 'POST', url: 'https://example.com/tamati/' },
      }),
    ).toBeUndefined()
  })
})
