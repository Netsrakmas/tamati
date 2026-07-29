// Drifting motes on the ground plane.
//
// Two jobs, both of them about density rather than features: they stop the plane reading
// as an empty field, and they give the pet something to *notice*. A creature that reacts
// to nothing has no interior life; one that gets distracted by a speck does.

import { Graphics } from 'pixi.js'
import { PALETTE } from '../style/palette'
import { depthScale, worldToScreen, type Ground, type WorldPos } from './ground'

export interface Mote {
  pos: WorldPos
  vx: number
  vy: number
  phase: number
  /** Popped motes fade out and respawn elsewhere. */
  life: number
}

const COUNT = 5

export function makeMotes(rand: () => number = Math.random): Mote[] {
  return Array.from({ length: COUNT }, () => spawn(rand))
}

function spawn(rand: () => number = Math.random): Mote {
  return {
    pos: { x: (rand() * 2 - 1) * 0.85, y: 0.28 + rand() * 0.66 },
    vx: (rand() - 0.5) * 0.035,
    vy: (rand() - 0.5) * 0.02,
    phase: rand() * Math.PI * 2,
    life: 1,
  }
}

export function updateMotes(motes: Mote[], dtMs: number, rand: () => number = Math.random): void {
  const dt = dtMs / 1000
  for (let i = 0; i < motes.length; i++) {
    const m = motes[i]
    if (m.life < 1) {
      m.life -= dt * 2
      if (m.life <= 0) motes[i] = spawn(rand)
      continue
    }
    m.pos.x += m.vx * dt
    m.pos.y += m.vy * dt
    m.phase += dt * 1.7
    // Bounce off the edges of the plane rather than vanishing.
    if (m.pos.x < -0.9 || m.pos.x > 0.9) m.vx *= -1
    if (m.pos.y < 0.26 || m.pos.y > 0.95) m.vy *= -1
    m.pos.x = clamp(m.pos.x, -0.9, 0.9)
    m.pos.y = clamp(m.pos.y, 0.26, 0.95)
  }
}

/** Nearest mote to a point, or null if they're all too far to bother with. */
export function nearestMote(motes: Mote[], from: WorldPos, maxDist = 0.9): Mote | null {
  let best: Mote | null = null
  let bestD = maxDist
  for (const m of motes) {
    if (m.life < 1) continue
    const d = Math.hypot(m.pos.x - from.x, (m.pos.y - from.y) * 1.6)
    if (d < bestD) {
      bestD = d
      best = m
    }
  }
  return best
}

export function popMote(m: Mote): void {
  m.life = 0.999
}

export function drawMotes(g: Graphics, ground: Ground, motes: Mote[]): void {
  g.clear()
  for (const m of motes) {
    const p = worldToScreen(ground, m.pos)
    const s = depthScale(m.pos.y)
    // The bob is what makes them read as floating rather than as spots on the floor.
    const bob = Math.sin(m.phase) * 7 * s
    const alpha = 0.34 * (m.life < 1 ? Math.max(0, m.life) : 1)
    g.circle(p.x, p.y - 26 * s + bob, 3.2 * s).fill({ color: PALETTE.uiMuted, alpha })
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
