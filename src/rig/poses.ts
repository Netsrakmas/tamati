// Authored poses the simulation blends toward. This is the half of the Rain World model
// that isn't physics: poses say what shape it wants to hold, verlet does the rest.

import type { PoseTarget } from './verlet'
import { BABY } from './skeleton'

export type PoseName = 'idle' | 'lookUp' | 'reach' | 'crouch'

/** Offsets are from the rig root. Derived from the skeleton's rest layout. */
function base(): Record<string, { ox: number; oy: number }> {
  const out: Record<string, { ox: number; oy: number }> = {}
  for (const p of BABY.points) out[p.name] = { ox: p.x, oy: p.y }
  return out
}

const POSES: Record<PoseName, Record<string, { ox: number; oy: number }>> = {
  idle: base(),
  lookUp: (() => {
    const p = base()
    p.head = { ox: 0, oy: -152 }
    p.ant1 = { ox: 6, oy: -212 }
    p.ant2 = { ox: 14, oy: -246 }
    return p
  })(),
  reach: (() => {
    const p = base()
    p.armL = { ox: -62, oy: -92 }
    p.armR = { ox: 62, oy: -92 }
    p.head = { ox: 0, oy: -150 }
    return p
  })(),
  crouch: (() => {
    const p = base()
    p.body = { ox: 0, oy: -34 }
    p.head = { ox: 0, oy: -124 }
    p.armL = { ox: -54, oy: -40 }
    p.armR = { ox: 54, oy: -40 }
    p.ant1 = { ox: 0, oy: -182 }
    p.ant2 = { ox: 0, oy: -214 }
    return p
  })(),
}

export function poseTargets(name: PoseName, indexOf: (n: string) => number): PoseTarget[] {
  const pose = POSES[name]
  return Object.entries(pose).map(([pointName, o]) => ({
    i: indexOf(pointName),
    ox: o.ox,
    oy: o.oy,
  }))
}

/** Blend between two poses — used so behaviour transitions don't pop. */
export function blendPose(
  from: PoseName,
  to: PoseName,
  t: number,
  indexOf: (n: string) => number,
): PoseTarget[] {
  const a = POSES[from]
  const b = POSES[to]
  const k = Math.max(0, Math.min(1, t))
  return Object.keys(a).map((name) => ({
    i: indexOf(name),
    ox: a[name].ox + (b[name].ox - a[name].ox) * k,
    oy: a[name].oy + (b[name].oy - a[name].oy) * k,
  }))
}
