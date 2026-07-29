import { describe, expect, it } from 'vitest'
import { Rig } from '../src/rig/verlet'
import { BABY } from '../src/rig/skeleton'
import { Behaviour } from '../src/pet/behaviours'
import { makeMotes, nearestMote, updateMotes, popMote } from '../src/world/dust'
import { greetingFor } from '../src/pet/greeting'

function makeBehaviour(withMotes = true): Behaviour {
  const rig = new Rig(
    BABY.points.map((p) => ({ ...p })),
    BABY.bones.map((b) => ({ ...b })),
    [],
    600,
  )
  rig.rootX = 300
  rig.rootY = 600
  const b = new Behaviour(rig)
  if (withMotes) b.setMotes(makeMotes())
  return b
}

/** Run the real update loop for a while at a fixed step. */
function run(b: Behaviour, ms: number, startAt = 10_000): string[] {
  const seen: string[] = []
  for (let t = 0; t < ms; t += 16) {
    b.update(16, startAt + t)
    if (b.idle && !seen.includes(b.idle)) seen.push(b.idle)
  }
  return seen
}

describe('tap escalation', () => {
  it('a single poke is a pleased bounce', () => {
    const b = makeBehaviour()
    b.onTap(1000)
    expect(b.tapLevel).toBe(1)
    expect(b.face).toBe('happy')
  })

  it('escalates to giggling by the third poke', () => {
    const b = makeBehaviour()
    b.onTap(1000)
    b.onTap(1100)
    b.onTap(1200)
    expect(b.tapLevel).toBe(3)
    expect(b.face).toBe('delighted')
  })

  it('gets annoyed at the fifth and stops finding it funny', () => {
    const b = makeBehaviour()
    for (let i = 0; i < 5; i++) b.onTap(1000 + i * 100)
    expect(b.tapLevel).toBe(5)
    expect(b.face).toBe('annoyed')
  })

  it('holds the annoyed face for a beat rather than snapping back', () => {
    const b = makeBehaviour()
    for (let i = 0; i < 5; i++) b.onTap(1000 + i * 100)
    b.update(16, 1600)
    expect(b.face).toBe('annoyed')
  })

  it('forgives you — taps outside the window do not accumulate', () => {
    const b = makeBehaviour()
    b.onTap(1000)
    b.onTap(1100)
    b.onTap(9000) // long after the window
    expect(b.tapLevel).toBe(1)
    expect(b.face).toBe('happy')
  })

  it('ignores pokes during a greeting — it is already busy being pleased', () => {
    const b = makeBehaviour()
    b.playGreeting(greetingFor(0, 9 * 3600_000))
    b.onTap(1000)
    expect(b.tapLevel).toBe(0)
  })
})

describe('idle nonsense', () => {
  it('does several different things when left alone', () => {
    const b = makeBehaviour()
    const seen = run(b, 90_000)
    expect(seen.length).toBeGreaterThanOrEqual(2)
  })

  it('every idle it starts also ends — nothing gets stuck', () => {
    const b = makeBehaviour()
    run(b, 60_000)
    // Keep running with no input; it must not be locked in one state forever.
    const before = b.idle
    run(b, 20_000, 200_000)
    expect(before === null || b.idle !== before || b.idle === null).toBe(true)
  })

  it('never starts nonsense during a greeting', () => {
    const b = makeBehaviour()
    b.playGreeting(greetingFor(0, 9 * 3600_000))
    for (let t = 0; t < 2000; t += 16) {
      b.update(16, 10_000 + t)
      expect(b.idle).toBeNull()
    }
  })

  it('never starts nonsense while being held', () => {
    const b = makeBehaviour()
    b.onGrabStart()
    for (let t = 0; t < 20_000; t += 16) {
      b.update(16, 10_000 + t)
      expect(b.idle).toBeNull()
    }
  })

  it('works with no motes present — chaseDust is skipped, not crashed', () => {
    const b = makeBehaviour(false)
    const seen = run(b, 60_000)
    expect(seen).not.toContain('chaseDust')
    expect(seen.length).toBeGreaterThan(0)
  })
})

describe('dust motes', () => {
  it('stay on the plane no matter how long they drift', () => {
    const motes = makeMotes()
    for (let i = 0; i < 4000; i++) updateMotes(motes, 16)
    for (const m of motes) {
      expect(m.pos.x).toBeGreaterThanOrEqual(-0.9)
      expect(m.pos.x).toBeLessThanOrEqual(0.9)
      expect(m.pos.y).toBeGreaterThanOrEqual(0.26)
      expect(m.pos.y).toBeLessThanOrEqual(0.95)
    }
  })

  it('a popped mote fades and is replaced, so the plane never empties', () => {
    const motes = makeMotes()
    const n = motes.length
    popMote(motes[0])
    for (let i = 0; i < 200; i++) updateMotes(motes, 16)
    expect(motes).toHaveLength(n)
    expect(motes.every((m) => m.life === 1)).toBe(true)
  })

  it('finds the nearest mote, and none when they are all far away', () => {
    const motes = makeMotes()
    motes.forEach((m, i) => (m.pos = { x: 0.5 + i * 0.01, y: 0.9 }))
    // Standing right next to them: finds the closest.
    expect(nearestMote(motes, { x: 0.49, y: 0.9 })?.pos.x).toBeCloseTo(0.5, 5)
    // Standing across the plane with a short attention span: bothers with none of them.
    expect(nearestMote(motes, { x: -0.9, y: 0.3 }, 0.2)).toBeNull()
  })
})
