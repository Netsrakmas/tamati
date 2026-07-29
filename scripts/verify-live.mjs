// Verify the deployed page, not the local build. Catches the class of failure that only
// happens live: wrong base path, case-sensitive 404s, stale service-worker caching.
//
//   node scripts/verify-live.mjs [url]

import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const URL_ = process.argv[2] ?? 'https://netsrakmas.github.io/tamati/'
const SHOTS = resolve(import.meta.dirname, '..', 'artifacts')
const CHROMIUM =
  process.env.CHROMIUM_PATH ??
  (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

const results = []
const pass = (n, d = '') => results.push({ ok: true, n, d })
const fail = (n, d = '') => results.push({ ok: false, n, d })

const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {})
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
})
await mkdir(SHOTS, { recursive: true })

const page = await ctx.newPage()
const errors = []
const failedRequests = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
page.on('requestfailed', (r) => failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`))
page.on('response', (r) => {
  if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`)
})

// The kill-gate link: force the full-joy reunion, not the cold-start 'glance'.
const target = `${URL_}?fastforward=9h`
const res = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 })
res && res.status() < 400
  ? pass('page responds', `HTTP ${res.status()}`)
  : fail('page responds', `HTTP ${res?.status()}`)

try {
  await page.waitForFunction(() => window.__tamati?.ready === true, { timeout: 20000 })
  pass('app boots and renders a first frame')
} catch {
  fail('app boots and renders a first frame', 'never became ready — check the console/network')
}

const tier = await page.evaluate(() => window.__tamati?.tier).catch(() => null)
tier === 'joy'
  ? pass('?fastforward=9h gives the full-joy greeting', 'the tier testers must see')
  : fail('?fastforward=9h gives the full-joy greeting', `got "${tier}"`)

const canvas = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return c ? { w: c.width, h: c.height } : null
})
canvas && canvas.w > 0
  ? pass('canvas sized', `${canvas.w}×${canvas.h} device px`)
  : fail('canvas sized')

await page.waitForTimeout(900)
await page.screenshot({ path: join(SHOTS, 'live-mobile.png') })

failedRequests.length === 0
  ? pass('no failed requests', 'no 404s — base path and asset case are correct')
  : fail('no failed requests', failedRequests.slice(0, 4).join(' | '))

errors.length === 0 ? pass('console clean') : fail('console clean', errors.slice(0, 3).join(' | '))

// Hard reload to defeat the service worker and prove a redeploy can actually reach people.
await page.reload({ waitUntil: 'domcontentloaded' })
try {
  await page.waitForFunction(() => window.__tamati?.ready === true, { timeout: 20000 })
  pass('survives a reload with the service worker active')
} catch {
  fail('survives a reload with the service worker active')
}

await browser.close()

console.log(`\n─── live: ${target} ───`)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? `  — ${r.d}` : ''}`)
const bad = results.filter((r) => !r.ok)
console.log(`\n${results.length - bad.length}/${results.length} checks passed`)
process.exit(bad.length ? 1 : 0)
