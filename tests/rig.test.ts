import { describe, expect, it } from 'vitest'
import { Rig } from '../src/rig/verlet'
import { BABY, BABY_HEIGHT } from '../src/rig/skeleton'
import { poseTargets } from '../src/rig/poses'
import { RIG } from '../src/style/motion'

const FLOOR = 600
const STEP = 1 / RIG.fixedStepHz

function makeRig(): Rig {
  const rig = new Rig(
    BABY.points.map((p) => ({ ...p })),
    BABY.bones.map((b) => ({ ...b })),
    [],
    FLOOR,
  )
  rig.rootX = 300
  rig.rootY = FLOOR
  rig.pose = poseTargets('idle', (n) => rig.index(n))
  for (const p of rig.points) {
    const t = BABY.points.find((q) => q.name === p.name)!
    p.x = p.px = rig.rootX + t.x
    p.y = p.py = FLOOR + t.y
  }
  return rig
}

function settle(rig: Rig, steps = 240): void {
  for (let i = 0; i < steps; i++) rig.step(STEP)
}

describe('verlet rig', () => {
  it('holds its rest pose instead of drifting or collapsing', () => {
    const rig = makeRig()
    const before = rig.points.map((p) => ({ x: p.x, y: p.y }))
    settle(rig)
    rig.points.forEach((p, i) => {
      expect(Math.abs(p.x - before[i].x)).toBeLessThan(6)
      expect(Math.abs(p.y - before[i].y)).toBeLessThan(6)
    })
  })

  it('never lets a point sink through the floor', () => {
    const rig = makeRig()
    settle(rig, 600)
    for (const p of rig.points) {
      expect(p.y).toBeLessThanOrEqual(FLOOR - p.radius + 0.5)
    }
  })

  it('never stretches a bone past maxStretchRatio, even when yanked hard', () => {
    const rig = makeRig()
    rig.grabbed = rig.index('head')
    // Haul it far off-screen — the worst case a real finger can produce.
    rig.grabX = 5000
    rig.grabY = -5000
    for (let i = 0; i < 300; i++) {
      rig.step(STEP)
      for (const c of rig.constraints) {
        const a = rig.points[c.a]
        const b = rig.points[c.b]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        expect(d).toBeLessThanOrEqual(c.rest * RIG.maxStretchRatio + 0.5)
      }
    }
  })

  it('stays finite under absurd input — no NaN leaks into the render', () => {
    const rig = makeRig()
    rig.grabbed = rig.index('ant2')
    for (let i = 0; i < 400; i++) {
      rig.grabX = 300 + Math.sin(i) * 9000
      rig.grabY = 200 + Math.cos(i * 1.7) * 9000
      rig.step(STEP)
    }
    for (const p of rig.points) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })

  it('can be dragged along the floor rather than sticking to it', () => {
    const rig = makeRig()
    settle(rig)
    const startX = rig.point('body').x
    rig.grabbed = rig.index('body')
    // Mirror what Behaviour.onGrabStart does — dropping pose strength is precisely what
    // makes it go rubbery in your hand instead of holding its shape against you.
    rig.poseStrength = 0.12
    for (let i = 0; i < 120; i++) {
      rig.grabX = startX + 200
      rig.grabY = FLOOR - 20 // pinned low, so the floor is actively in play
      rig.step(STEP)
    }
    expect(rig.point('body').x).toBeGreaterThan(startX + 100)
  })

  it('reports a land impact when dropped from height', () => {
    const rig = makeRig()
    settle(rig)
    for (const p of rig.points) {
      p.y -= 300
      p.py = p.y
    }
    let maxImpact = 0
    for (let i = 0; i < 120; i++) {
      rig.step(STEP)
      maxImpact = Math.max(maxImpact, rig.landImpact)
    }
    expect(maxImpact).toBeGreaterThan(6) // the threshold behaviours.ts squashes on
  })
})

describe('A5 — proportion', () => {
  it('keeps the baby head at 55% of total height', () => {
    expect(BABY.headFraction).toBeCloseTo(0.55, 5)
  })

  it('spans exactly the documented height from crown to floor', () => {
    const head = BABY.points.find((p) => p.name === 'head')!
    const crown = Math.abs(head.y) + head.radius
    expect(crown).toBe(BABY_HEIGHT)
  })
})
