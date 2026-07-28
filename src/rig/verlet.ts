// Point masses and distance constraints. See RESEARCH.md angle 1.
//
// Rain World's model: a creature is points in space held at fixed distances — a soft,
// bendable paper-doll. Poses give targets; this sim handles everything else, which is
// what makes grab-and-wiggle work at all. It cannot be keyframed.

import { RIG } from '../style/motion'

export interface Point {
  name: string
  x: number
  y: number
  px: number // previous position — verlet stores velocity implicitly
  py: number
  /** 0 = immovable. Used for nothing yet, but the solver honours it. */
  invMass: number
  radius: number
}

export interface Constraint {
  a: number // index into points
  b: number
  rest: number
  /** 0..1. Lower = floppier limb. */
  stiffness: number
}

export interface PoseTarget {
  /** Index into points. */
  i: number
  /** Offset from the rig root, in px. */
  ox: number
  oy: number
}

export class Rig {
  points: Point[] = []
  constraints: Constraint[] = []

  /** Where the body wants to be. Behaviour code drives this; the sim follows. */
  rootX = 0
  rootY = 0

  /** How hard points are pulled toward their pose. Drops while grabbed → goes rubbery. */
  poseStrength = 1

  /** Index of the grabbed point, or -1. */
  grabbed = -1
  grabX = 0
  grabY = 0

  /** Set by the solver when a point hits the floor hard enough to squash. */
  landImpact = 0

  constructor(
    points: Array<Omit<Point, 'px' | 'py'>>,
    bones: Array<{ a: string; b: string; stiffness?: number }>,
    public pose: PoseTarget[],
    public floorY: number,
  ) {
    this.points = points.map((p) => ({ ...p, px: p.x, py: p.y }))
    const idx = new Map(this.points.map((p, i) => [p.name, i]))
    this.constraints = bones.map((b) => {
      const a = idx.get(b.a)
      const bb = idx.get(b.b)
      if (a === undefined || bb === undefined) {
        throw new Error(`bone references unknown point: ${b.a}->${b.b}`)
      }
      return {
        a,
        b: bb,
        rest: Math.hypot(this.points[a].x - this.points[bb].x, this.points[a].y - this.points[bb].y),
        stiffness: b.stiffness ?? 1,
      }
    })
  }

  index(name: string): number {
    return this.points.findIndex((p) => p.name === name)
  }

  point(name: string): Point {
    const p = this.points[this.index(name)]
    if (!p) throw new Error(`no point named ${name}`)
    return p
  }

  /** One fixed step. Never call this with a variable delta. */
  step(dt: number): void {
    this.landImpact = 0

    for (const p of this.points) {
      if (p.invMass === 0) continue
      const vx = (p.x - p.px) * RIG.damping
      const vy = (p.y - p.py) * RIG.damping
      p.px = p.x
      p.py = p.y
      p.x += vx
      p.y += vy + RIG.gravity * dt * dt
    }

    // Pull toward the authored pose. This is what holds a shape without keyframing one.
    if (this.poseStrength > 0) {
      for (const t of this.pose) {
        const p = this.points[t.i]
        if (p.invMass === 0) continue
        const tx = this.rootX + t.ox
        const ty = this.rootY + t.oy
        p.x += (tx - p.x) * 0.25 * this.poseStrength
        p.y += (ty - p.y) * 0.25 * this.poseStrength
      }
    }

    // Grab is applied once per step, not once per iteration — otherwise the spring
    // constant in motion.ts would silently mean 8x what it says. It goes BEFORE the
    // solver so constraints and the floor get the last word; applying it afterwards
    // lets a hard yank leave the rig over-stretched at the moment it's rendered.
    this.applyGrab()

    for (let iter = 0; iter < RIG.constraintIterations; iter++) {
      this.solveConstraints()
      this.collideFloor()
    }
  }

  private solveConstraints(): void {
    for (const c of this.constraints) {
      const a = this.points[c.a]
      const b = this.points[c.b]
      const w = a.invMass + b.invMass
      if (w === 0) continue
      const wa = a.invMass / w
      const wb = b.invMass / w

      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.hypot(dx, dy)
      if (dist < 1e-4) {
        dx = 1e-4
        dist = 1e-4
      }

      // Soft pull toward rest. stiffness < 1 leaves deliberate slack — that slack is
      // what makes a shaken limb funny rather than rigid.
      const soft = ((dist - c.rest) / dist) * c.stiffness
      a.x += dx * soft * wa
      a.y += dy * soft * wa
      b.x -= dx * soft * wb
      b.y -= dy * soft * wb

      // Hard limit so a yanked limb can't stretch past maxStretchRatio.
      const max = c.rest * RIG.maxStretchRatio
      const ndx = b.x - a.x
      const ndy = b.y - a.y
      const nd = Math.hypot(ndx, ndy)
      if (nd > max) {
        const ex = (nd - max) / nd
        a.x += ndx * ex * wa
        a.y += ndy * ex * wa
        b.x -= ndx * ex * wb
        b.y -= ndy * ex * wb
      }
    }
  }

  private applyGrab(): void {
    if (this.grabbed < 0) return
    const p = this.points[this.grabbed]
    p.x += (this.grabX - p.x) * RIG.grabSpringK
    p.y += (this.grabY - p.y) * RIG.grabSpringK
  }

  private collideFloor(): void {
    for (const p of this.points) {
      if (p.invMass === 0) continue
      const limit = this.floorY - p.radius
      if (p.y <= limit) continue

      const vy = p.y - p.py
      if (vy > this.landImpact) this.landImpact = vy
      p.y = limit

      // Friction, not a full stop — a full stop makes it impossible to drag along
      // the ground. A small bounce keeps a dropped baby squishy rather than dead.
      const vx = p.x - p.px
      p.px = p.x - vx * 0.82
      p.py = p.y + vy * 0.25
    }
  }
}
