// Greeting playback, grab/shake reactions, and the idle nonsense that makes it feel alive.
// M1 is baby-only: everything here is the "pure slapstick, breaks feel-it-don't-see-it"
// reading. Tonal aging lands in M4.

import { Rig } from '../rig/verlet'
import { blendPose, type PoseName } from '../rig/poses'
import { IDLE, SHAKE, SQUASH } from '../style/motion'
import type { GreetingSpec } from './greeting'

export type Face = 'normal' | 'happy' | 'delighted' | 'blink' | 'joy'

interface Hop {
  atMs: number
  power: number
}

export class Behaviour {
  private t = 0
  private greeting: GreetingSpec | null = null
  private hops: Hop[] = []
  private nextHop = 0

  /** 0 = far from camera, 1 = right up against it. */
  approach = 1
  face: Face = 'normal'
  shakePx = 0

  private blinkAt = 0
  private blinkUntil = 0

  private squashT = -1
  private lastLandGuard = 0

  /** Set while the pointer is holding the pet. */
  grabbing = false
  private shakeSamples: Array<{ t: number; x: number }> = []
  shaking = false
  /** Exposed for the harness — a silent shake detector is very hard to diagnose by hand. */
  shakeFlips = 0
  get shakeSampleCount(): number {
    return this.shakeSamples.length
  }
  private wantsMoreUntil = 0

  private poseFrom: PoseName = 'idle'
  private poseTo: PoseName = 'idle'
  private poseT = 1

  constructor(private rig: Rig, private baseRootY: number) {
    this.rig.rootY = baseRootY
    this.blinkAt = randBetween(IDLE.blinkEveryMs[0], IDLE.blinkEveryMs[1])
  }

  /** Called on resize — the floor moves, so the pet's resting height must follow. */
  setBaseRootY(y: number): void {
    this.baseRootY = y
  }

  playGreeting(spec: GreetingSpec): void {
    this.greeting = spec
    this.t = 0
    this.nextHop = 0
    this.shakePx = 0

    switch (spec.tier) {
      case 'glance':
        this.approach = 1
        this.hops = []
        this.setPose('lookUp')
        break
      case 'bounce':
        this.approach = 1
        this.hops = [
          { atMs: 60, power: 5 },
          { atMs: 460, power: 3.5 },
        ]
        this.setPose('lookUp')
        break
      case 'trot':
        this.approach = 0
        this.hops = [
          { atMs: 80, power: 4 },
          { atMs: 420, power: 4 },
          { atMs: 760, power: 4 },
        ]
        this.setPose('lookUp')
        break
      case 'joy':
        this.approach = 0
        this.hops = [
          { atMs: 40, power: 7 },
          { atMs: 300, power: 7 },
          { atMs: 560, power: 8 },
          { atMs: 860, power: 6 },
        ]
        this.setPose('reach')
        break
      case 'driftJoy':
        // Hesitates first. Same joy, arrived at slowly — it's recovering, not sulking.
        this.approach = 0
        this.hops = [
          { atMs: 900, power: 4 },
          { atMs: 1300, power: 7 },
          { atMs: 1600, power: 8 },
          { atMs: 1900, power: 6 },
        ]
        this.setPose('crouch')
        break
    }
  }

  private setPose(to: PoseName): void {
    this.poseFrom = this.poseTo
    this.poseTo = to
    this.poseT = 0
  }

  get greetingActive(): boolean {
    return this.greeting !== null
  }

  onGrabStart(): void {
    this.grabbing = true
    this.shakeSamples = []
    this.face = 'happy'
    // Let physics dominate: this is what makes it go rubbery in your hand.
    this.rig.poseStrength = 0.12
  }

  /**
   * Shake detection from absolute positions, not per-event deltas.
   *
   * Counting deltas made this dependent on how often pointermove happens to fire, which
   * varies with device and frame rate — the same gesture read as a shake on one phone and
   * not on another. Turning points in the path are sample-rate independent, and requiring
   * a real swing between them stops a trembling finger triggering it.
   */
  onGrabMove(x: number, nowMs: number): void {
    this.shakeSamples.push({ t: nowMs, x })
    const cutoff = nowMs - SHAKE.windowMs
    while (this.shakeSamples.length && this.shakeSamples[0].t < cutoff) this.shakeSamples.shift()

    let reversals = 0
    let dir = 0
    let anchor = this.shakeSamples[0]?.x ?? x
    for (let i = 1; i < this.shakeSamples.length; i++) {
      const step = this.shakeSamples[i].x - this.shakeSamples[i - 1].x
      if (Math.abs(step) < 1) continue
      const d = Math.sign(step)
      if (dir === 0) {
        dir = d
        continue
      }
      if (d !== dir) {
        const swing = Math.abs(this.shakeSamples[i - 1].x - anchor)
        if (swing >= SHAKE.minSwingPx) {
          reversals++
          anchor = this.shakeSamples[i - 1].x
          dir = d
        }
      }
    }

    this.shakeFlips = reversals
    this.shaking = reversals >= SHAKE.minReversals
    if (this.shaking) this.face = 'delighted'
  }

  onGrabEnd(nowMs: number): void {
    const wasShaken = this.shaking
    this.grabbing = false
    this.shaking = false
    this.rig.poseStrength = 1
    this.shakeSamples = []
    // "Wants more the instant you stop." Baby only — the teen will go rigid instead.
    if (wasShaken) this.wantsMoreUntil = nowMs + 1400
  }

  update(dtMs: number, nowMs: number): void {
    this.t += dtMs

    // --- greeting playback -------------------------------------------------
    if (this.greeting) {
      const g = this.greeting
      this.face = g.tier === 'glance' ? 'normal' : 'joy'

      if (g.tier === 'trot' || g.tier === 'joy') {
        const approachMs = g.tier === 'joy' ? 500 : 900
        this.approach = Math.min(1, this.t / approachMs)
      } else if (g.tier === 'driftJoy') {
        const hesitate = 700
        this.approach = this.t < hesitate ? 0 : Math.min(1, (this.t - hesitate) / 700)
        if (this.t >= hesitate && this.poseTo === 'crouch') this.setPose('reach')
      }

      while (this.nextHop < this.hops.length && this.t >= this.hops[this.nextHop].atMs) {
        this.impulse('body', this.hops[this.nextHop].power)
        this.nextHop++
      }

      if (g.shakePx > 0) {
        const shakeStart = g.tier === 'driftJoy' ? 1400 : g.tier === 'joy' ? 500 : 0
        const into = this.t - shakeStart
        this.shakePx =
          into >= 0 && into < g.shakeMs ? g.shakePx * (1 - into / g.shakeMs) : 0
      }

      if (this.t >= g.durationMs) {
        this.greeting = null
        this.approach = 1
        this.shakePx = 0
        this.face = 'normal'
        this.setPose('idle')
      }
    } else if (nowMs < this.wantsMoreUntil) {
      this.face = 'happy'
      if (this.poseTo !== 'reach') this.setPose('reach')
    } else if (!this.grabbing) {
      // Put down after a plain drag: settle back to a neutral face. Without this the
      // grab-time 'happy' sticks forever and the pet grins at nothing.
      this.face = 'normal'
      if (this.poseTo !== 'idle') this.setPose('idle')
    }

    // --- pose blending -----------------------------------------------------
    this.poseT = Math.min(1, this.poseT + dtMs / 260)
    this.rig.pose = blendPose(this.poseFrom, this.poseTo, ease(this.poseT), (n) =>
      this.rig.index(n),
    )

    // --- root position: approach moves it toward the camera ----------------
    this.rig.rootY = this.baseRootY - (1 - this.approach) * 70

    // --- blinking ----------------------------------------------------------
    if (!this.grabbing && !this.greeting) {
      if (nowMs > this.blinkAt && nowMs > this.blinkUntil) {
        this.blinkUntil = nowMs + IDLE.blinkDurMs
        this.blinkAt =
          nowMs + IDLE.blinkDurMs + randBetween(IDLE.blinkEveryMs[0], IDLE.blinkEveryMs[1])
      }
      if (nowMs < this.blinkUntil) this.face = 'blink'
    }

    // --- squash on landing -------------------------------------------------
    if (this.rig.landImpact > 6 && nowMs - this.lastLandGuard > 120) {
      this.squashT = 0
      this.lastLandGuard = nowMs
    }
    if (this.squashT >= 0) {
      this.squashT += dtMs
      if (this.squashT > SQUASH.recoverMs) this.squashT = -1
    }
  }

  /** Visual scale multiplier. Baby deliberately breaks "feel it, don't see it". */
  squashScale(): { x: number; y: number } {
    if (this.squashT < 0) return { x: 1, y: 1 }
    const k = this.squashT / SQUASH.recoverMs
    const s = SQUASH.baby
    if (k < 0.45) {
      const t = k / 0.45
      return { x: lerp(s.landX, SQUASH.overshoot.x, t), y: lerp(s.landY, SQUASH.overshoot.y, t) }
    }
    const t = (k - 0.45) / 0.55
    return { x: lerp(SQUASH.overshoot.x, 1, t), y: lerp(SQUASH.overshoot.y, 1, t) }
  }

  /** Perspective: further away reads as smaller. */
  approachScale(): number {
    return 0.78 + 0.22 * this.approach
  }

  breathe(nowMs: number): number {
    if (this.grabbing) return 1
    return 1 + Math.sin((nowMs / 1000) * IDLE.breathHz * Math.PI * 2) * IDLE.breathAmp
  }

  private impulse(name: string, power: number): void {
    const p = this.rig.point(name)
    p.py += power
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
function ease(t: number): number {
  return t * t * (3 - 2 * t)
}
function randBetween(a: number, b: number): number {
  return a + Math.random() * (b - a)
}
