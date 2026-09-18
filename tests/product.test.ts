import { afterEach, describe, expect, it, vi } from 'vitest'
import { fresh, migrate, load, save } from '../src/persist/store'
import { hasSettled, isSleepTime, CARE_DURATION } from '../src/pet/care'
import { Behaviour } from '../src/pet/behaviours'
import { Rig } from '../src/rig/verlet'
import { BABY } from '../src/rig/skeleton'
import { makeGround, worldToScreen, screenToWorldX } from '../src/world/ground'
const now = new Date(2026, 8, 17, 12).getTime()
afterEach(() => vi.unstubAllGlobals())
describe('existing companions and local saves', () => {
  it('migrates the original v1 without losing visits or last-seen', () => {
    const s = migrate({ version: 1, visits: 19, lastSeen: now - 3600_000 }, now)
    expect(s).toMatchObject({
      version: 2,
      visits: 19,
      lastSeen: now - 3600_000,
      name: 'Momo',
    })
    expect(s.care).toEqual({ snack: 0, clean: 0, play: 0 })
  })
  it.each([
    null,
    'bad',
    14,
    {},
    { visits: -2, lastSeen: Infinity },
    { visits: NaN, name: [], light: 'bad', care: 'wrong' },
  ])('repairs malformed data: %j', (raw) => {
    const s = migrate(raw, now)
    expect(s.visits).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(s.lastSeen)).toBe(true)
    expect(s.name).toBe('Momo')
    expect(s.light).toBe('auto')
  })
  it('clamps future dates and trims names', () => {
    const s = migrate(
      {
        lastSeen: now + 1000,
        visits: 2.9,
        name: '  Sprout  ',
        care: { snack: now + 10, clean: -1, play: NaN },
      },
      now,
    )
    expect(s.lastSeen).toBe(now)
    expect(s.name).toBe('Sprout')
    expect(s.visits).toBe(2)
    expect(s.care).toEqual({ snack: now, clean: 0, play: 0 })
  })
  it('survives unavailable browser storage and reports failed saves', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw Error('blocked')
      },
      setItem() {
        throw Error('quota')
      },
    })
    expect(load(now)).toEqual({ save: fresh(now), firstRun: true })
    expect(save(fresh(now))).toBe(false)
  })
  it('recovers corrupt JSON', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{invalid' })
    expect(load(now).save).toEqual(fresh(now))
  })
})
function makeBehaviour() {
  const rig = new Rig(
    BABY.points.map((p) => ({ ...p })),
    BABY.bones.map((b) => ({ ...b })),
    [],
    400,
  )
  return { rig, b: new Behaviour(rig) }
}
describe('a complete quiet visit', () => {
  it.each([['snack'], ['clean'], ['play']] as const)(
    '%s has a sustained reaction and returns to ordinary play',
    (action) => {
      const { b } = makeBehaviour()
      b.startCare(action)
      for (let t = 0; t < CARE_DURATION[action]; t += 16) b.update(16, t)
      expect(b.careAction).toBe(action)
      expect(['happy', 'delighted']).toContain(b.face)
      expect(b.walking).toBe(false)
      b.finishCare()
      b.update(16, 10000)
      expect(b.careAction).toBeNull()
      expect(b.sleeping).toBe(false)
    },
  )
  it('sleep cancels a grab and does not wander or escalate pokes', () => {
    const { b, rig } = makeBehaviour()
    rig.grabbed = 1
    b.onGrabStart()
    b.rest(true)
    const pos = { ...b.world }
    b.onTap(1000)
    for (let t = 0; t < 10_000; t += 16) b.update(16, t)
    expect(rig.grabbed).toBe(-1)
    expect(b.grabbing).toBe(false)
    expect(b.world).toEqual(pos)
    expect(b.face).toBe('asleep')
    expect(b.tapLevel).toBe(0)
    b.rest(false)
    b.update(16, 20_000)
    expect(b.face).not.toBe('asleep')
  })
  it('care gently wakes a sleeping companion', () => {
    const { b } = makeBehaviour()
    b.rest(true)
    b.startCare('snack')
    b.update(16, 100)
    expect(b.sleeping).toBe(false)
    expect(b.face).toBe('happy')
  })
  it('reduced motion suppresses jump impulses and squash while keeping reactions', () => {
    const { b, rig } = makeBehaviour()
    b.reducedMotion = true
    const before = rig.point('body').py
    b.onTap(1000)
    expect(rig.point('body').py).toBe(before)
    expect(b.face).toBe('happy')
    expect(b.squashScale()).toEqual({ x: 1, y: 1 })
    expect(b.breathe(1100)).toBe(1)
  })
  it('settling never depends on streaks or punishes absence', () => {
    expect(hasSettled({ snack: now, clean: now, play: now }, now)).toBe(true)
    expect(hasSettled({ snack: now, clean: 0, play: now }, now)).toBe(false)
    const old = { visits: 25, lastSeen: now - 90 * 86400_000 }
    expect(migrate(old, now).visits).toBe(25)
  })
  it.each([
    [6, 59, true],
    [7, 0, false],
    [21, 59, false],
    [22, 0, true],
    [0, 0, true],
  ])('sleep at %i:%i = %s', (hour, minute, expected) => {
    expect(
      isSleepTime(new Date(2026, 8, 17, Number(hour), Number(minute))),
    ).toBe(expected)
  })
})
describe('responsive room coordinates', () => {
  it.each([
    [320, 320],
    [352, 520],
    [1014, 440],
    [740, 320],
  ])('keeps the pet visible and drag mapping reversible at %ix%i', (w, h) => {
    const g = makeGround(w, h)
    for (const y of [0.2, 0.32, 0.6, 0.92])
      for (const x of [-0.72, 0, 0.72]) {
        const p = worldToScreen(g, { x, y })
        expect(screenToWorldX(g, p.x, y)).toBeCloseTo(x, 8)
        expect(p.x - 72 * p.scale).toBeGreaterThan(0)
        expect(p.x + 72 * p.scale).toBeLessThan(w)
        expect(p.y - 255 * p.scale).toBeGreaterThan(0)
        expect(p.y + 20 * p.scale).toBeLessThan(h)
      }
  })
})
