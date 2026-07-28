import { describe, expect, it } from 'vitest'
import { greetingFor, TIER_BOUNDARIES_MS } from '../src/pet/greeting'

const MIN = 60_000
const HOUR = 60 * MIN

describe('A3 — deterministic greeting', () => {
  it('gives the same tier for the same inputs, every time', () => {
    const last = 1_700_000_000_000
    const now = last + 3 * HOUR
    const first = greetingFor(last, now)
    for (let i = 0; i < 500; i++) {
      expect(greetingFor(last, now)).toEqual(first)
    }
  })

  it('maps each documented band to its tier', () => {
    const t0 = 1_700_000_000_000
    expect(greetingFor(t0, t0).tier).toBe('glance')
    expect(greetingFor(t0, t0 + 4 * MIN).tier).toBe('glance')
    expect(greetingFor(t0, t0 + 5 * MIN).tier).toBe('bounce')
    expect(greetingFor(t0, t0 + 59 * MIN).tier).toBe('bounce')
    expect(greetingFor(t0, t0 + 1 * HOUR).tier).toBe('trot')
    expect(greetingFor(t0, t0 + 5 * HOUR).tier).toBe('trot')
    expect(greetingFor(t0, t0 + 6 * HOUR).tier).toBe('joy')
    expect(greetingFor(t0, t0 + 71 * HOUR).tier).toBe('joy')
    expect(greetingFor(t0, t0 + 72 * HOUR).tier).toBe('driftJoy')
    expect(greetingFor(t0, t0 + 365 * 24 * HOUR).tier).toBe('driftJoy')
  })

  it('only full joy shakes the screen, and by exactly 6px', () => {
    const t0 = 1_700_000_000_000
    expect(greetingFor(t0, t0 + 2 * MIN).shakePx).toBe(0)
    expect(greetingFor(t0, t0 + 30 * MIN).shakePx).toBe(0)
    expect(greetingFor(t0, t0 + 2 * HOUR).shakePx).toBe(0)
    expect(greetingFor(t0, t0 + 8 * HOUR).shakePx).toBe(6)
    expect(greetingFor(t0, t0 + 100 * HOUR).shakePx).toBe(6)
  })

  it('clamps a backwards clock instead of rewarding it', () => {
    const t0 = 1_700_000_000_000
    // Device time changed, or DST. Must not read as a long absence.
    expect(greetingFor(t0, t0 - 10 * HOUR).tier).toBe('glance')
  })
})

describe('A9 — absence monotonicity', () => {
  it('never gives a smaller reaction for a longer absence', () => {
    const t0 = 1_700_000_000_000
    let prevRank = -1
    for (let gap = 0; gap <= 200 * HOUR; gap += 7 * MIN) {
      const rank = greetingFor(t0, t0 + gap).rank
      expect(rank).toBeGreaterThanOrEqual(prevRank)
      prevRank = rank
    }
  })

  it('holds across randomised ordered pairs', () => {
    const t0 = 1_700_000_000_000
    for (let i = 0; i < 2000; i++) {
      const a = Math.random() * 200 * HOUR
      const b = a + Math.random() * 200 * HOUR
      const ra = greetingFor(t0, t0 + a).rank
      const rb = greetingFor(t0, t0 + b).rank
      expect(rb).toBeGreaterThanOrEqual(ra)
    }
  })

  it('duration also never shrinks as absence grows', () => {
    const t0 = 1_700_000_000_000
    let prev = 0
    for (const boundary of TIER_BOUNDARIES_MS) {
      const d = greetingFor(t0, t0 + boundary).durationMs
      expect(d).toBeGreaterThanOrEqual(prev)
      prev = d
    }
  })

  it('rewards compulsive checking least of all', () => {
    const t0 = 1_700_000_000_000
    const compulsive = greetingFor(t0, t0 + 30_000)
    const overnight = greetingFor(t0, t0 + 9 * HOUR)
    expect(compulsive.rank).toBeLessThan(overnight.rank)
    expect(compulsive.durationMs).toBeLessThan(overnight.durationMs)
  })
})
