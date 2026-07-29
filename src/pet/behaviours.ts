// Greeting playback, grab/shake reactions, and the idle nonsense that makes it feel alive.
// M1 is baby-only: everything here is the "pure slapstick, breaks feel-it-don't-see-it"
// reading. Tonal aging lands in M4.

import { Rig } from '../rig/verlet'
import { blendPose, type PoseName } from '../rig/poses'
import { IDLE, SHAKE, SQUASH } from '../style/motion'
import type { GreetingSpec } from './greeting'
import { nearestMote, popMote, type Mote } from '../world/dust'
import {
  GREETING_SPOT,
  distance,
  randomWanderTarget,
  screenToWorldX,
  type Ground,
  type WorldPos,
} from '../world/ground'

/** Where it comes from when it approaches you: the back of the plane, dead centre. */
const FAR_SPOT: WorldPos = { x: 0, y: 0.2 }

const WANDER = {
  speed: 0.34, // world units per second
  pauseMs: [1400, 5200] as const,
  hopEveryMs: 380,
  arriveEpsilon: 0.04,
} as const

export type Face =
  | 'normal'
  | 'happy'
  | 'delighted'
  | 'blink'
  | 'joy'
  | 'asleep'
  | 'annoyed'
  | 'surprised'

/**
 * Idle nonsense. The single highest smile-per-line item in the project: a creature that
 * only reacts when prodded has no interior life, one that gets distracted by a speck does.
 * Weighted so the quiet ones are common and the big gags stay rare enough to still land.
 */
export type IdleName = 'lookAround' | 'hiccup' | 'scratch' | 'doze' | 'sneeze' | 'chaseDust'

const IDLE_POOL: Array<{ name: IdleName; weight: number; ms: number }> = [
  { name: 'lookAround', weight: 30, ms: 1900 },
  { name: 'hiccup', weight: 20, ms: 900 },
  { name: 'scratch', weight: 16, ms: 1500 },
  { name: 'chaseDust', weight: 16, ms: 5200 },
  { name: 'sneeze', weight: 10, ms: 1400 },
  { name: 'doze', weight: 8, ms: 4200 },
]

const IDLE_GAP_MS = [1200, 4200] as const

interface Hop {
  atMs: number
  power: number
}

export class Behaviour {
  private t = 0
  private greeting: GreetingSpec | null = null
  private hops: Hop[] = []
  private nextHop = 0

  /** 0 = far from camera, 1 = right up against it. Drives depth along the ground plane. */
  approach = 1
  face: Face = 'normal'
  shakePx = 0

  /** Position on the ground plane. The rig knows nothing about this. */
  world: WorldPos = { ...GREETING_SPOT }
  /** -1 facing left, 1 facing right. */
  facing: 1 | -1 = 1
  private greetFrom: WorldPos = { ...GREETING_SPOT }
  private wanderTarget: WorldPos | null = null
  private pauseUntil = 0
  private lastHopAt = 0
  /** True while walking somewhere, so the renderer can lean it into the movement. */
  walking = false

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

  /** Current bit of nonsense, if any. */
  idle: IdleName | null = null
  private idleT = 0
  private idleDur = 0
  private nextIdleAt = 0
  private idleStep = 0
  private dustTarget: Mote | null = null
  private motes: Mote[] = []

  /** Escalating reaction to being poked. See onTap. */
  private taps: number[] = []
  private annoyedUntil = 0
  tapLevel = 0

  constructor(private rig: Rig) {
    this.blinkAt = randBetween(IDLE.blinkEveryMs[0], IDLE.blinkEveryMs[1])
  }

  /** The motes it may notice. Passed in so the behaviour owns no world state. */
  setMotes(motes: Mote[]): void {
    this.motes = motes
  }

  /**
   * Poking it. Escalates rather than repeating: charming, then over-stimulated, then
   * done with you. Straight out of the spec's examples — a reaction, never a score.
   *
   * 1–2 taps  → pleased little bounce
   * 3–4 taps  → giggling, wobbling
   * 5+ taps   → annoyed, flinches back, and walks off in a huff
   */
  onTap(nowMs: number): void {
    if (this.greeting || this.grabbing) return
    this.taps.push(nowMs)
    const cutoff = nowMs - 1500
    while (this.taps.length && this.taps[0] < cutoff) this.taps.shift()
    this.tapLevel = this.taps.length

    this.cancelIdle(nowMs)

    if (this.tapLevel >= 5) {
      this.face = 'annoyed'
      this.setPose('recoil')
      this.annoyedUntil = nowMs + 1600
      this.impulse('body', 4)
      // Storm off somewhere else. Being ignored is funnier than being told off.
      this.wanderTarget = randomWanderTarget()
      this.pauseUntil = 0
    } else if (this.tapLevel >= 3) {
      this.face = 'delighted'
      this.setPose('reach')
      this.impulse('body', 5.5)
      this.impulse('ant2', 3)
    } else {
      this.face = 'happy'
      this.setPose('lookUp')
      this.impulse('body', 4)
    }
  }

  /** Carry the pet sideways across the plane while it's held. Depth stays fixed. */
  dragTo(ground: Ground, screenX: number): void {
    this.world = { x: screenToWorldX(ground, screenX, this.world.y), y: this.world.y }
    this.wanderTarget = null
  }

  playGreeting(spec: GreetingSpec): void {
    this.greeting = spec
    this.t = 0
    this.nextHop = 0
    this.shakePx = 0
    this.wanderTarget = null

    // Tiers that approach you start at the back of the plane and come forward; the
    // ones that don't are already near, and stay put. In 3/4 view "runs at the camera"
    // is a real walk in depth rather than a scale trick.
    const comesToYou = spec.tier === 'trot' || spec.tier === 'joy' || spec.tier === 'driftJoy'
    this.greetFrom = comesToYou ? { ...FAR_SPOT } : { ...GREETING_SPOT }
    this.world = { ...this.greetFrom }

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
    } else if (nowMs < this.annoyedUntil) {
      this.face = 'annoyed'
    } else if (!this.grabbing && !this.idle) {
      // Put down after a plain drag: settle back to a neutral face. Without this the
      // grab-time 'happy' sticks forever and the pet grins at nothing.
      this.face = 'normal'
      if (this.poseTo !== 'idle') this.setPose('idle')
    }

    // --- position on the ground plane --------------------------------------
    this.updateWorld(dtMs, nowMs)

    // --- idle nonsense (after walking is known) ----------------------------
    this.updateIdle(dtMs, nowMs)

    // --- pose blending, last so idles get the final say --------------------
    this.poseT = Math.min(1, this.poseT + dtMs / 260)
    this.rig.pose = blendPose(this.poseFrom, this.poseTo, ease(this.poseT), (n) =>
      this.rig.index(n),
    )

    // --- blinking ----------------------------------------------------------
    if (!this.grabbing && !this.greeting && !this.idle && nowMs >= this.annoyedUntil) {
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

  private cancelIdle(nowMs: number): void {
    this.idle = null
    this.dustTarget = null
    this.nextIdleAt = nowMs + randBetween(IDLE_GAP_MS[0], IDLE_GAP_MS[1])
  }

  private pickIdle(): { name: IdleName; ms: number } {
    const pool = this.motes.length ? IDLE_POOL : IDLE_POOL.filter((i) => i.name !== 'chaseDust')
    const total = pool.reduce((s, i) => s + i.weight, 0)
    let r = Math.random() * total
    for (const i of pool) {
      r -= i.weight
      if (r <= 0) return { name: i.name, ms: i.ms }
    }
    return { name: pool[0].name, ms: pool[0].ms }
  }

  /**
   * The nonsense. Each one is a few lines and a pose — the point is that there are
   * several of them and you never quite know which you'll get.
   */
  private updateIdle(dtMs: number, nowMs: number): void {
    if (this.greeting || this.grabbing || nowMs < this.annoyedUntil) return

    if (!this.idle) {
      // Only start something while standing still, and never mid-walk.
      if (this.walking || nowMs < this.nextIdleAt) return
      const chosen = this.pickIdle()
      this.idle = chosen.name
      this.idleDur = chosen.ms
      this.idleT = 0
      this.idleStep = 0
      if (this.idle === 'chaseDust') {
        this.dustTarget = nearestMote(this.motes, this.world)
        if (!this.dustTarget) {
          this.cancelIdle(nowMs)
          return
        }
        this.setPose('perk')
      }
      return
    }

    this.idleT += dtMs
    const k = this.idleT / this.idleDur

    switch (this.idle) {
      case 'lookAround': {
        // Left, then right, then back to neutral. Cheap, and it reads as curiosity.
        if (k < 0.35) this.want('lookSide', 'normal')
        else if (k < 0.7) this.want('lookUp', 'normal')
        else this.want('idle', 'normal')
        break
      }
      case 'hiccup': {
        // One sharp involuntary jolt, then a slightly startled beat.
        if (this.idleStep === 0) {
          this.idleStep = 1
          this.impulse('body', 6)
          this.impulse('ant2', 4)
          this.face = 'surprised'
          this.setPose('perk')
        } else if (k > 0.55) {
          this.want('idle', 'normal')
        }
        break
      }
      case 'scratch': {
        this.want('lookSide', 'normal')
        // Little repeated nudges on one arm — a scratch without an arm rig.
        if (this.idleT - this.idleStep > 110) {
          this.idleStep = this.idleT
          this.impulse('armR', 2.4)
        }
        break
      }
      case 'sneeze': {
        // Wind up, then blow.
        if (k < 0.55) {
          this.want('crouch', 'surprised')
        } else if (this.idleStep === 0) {
          this.idleStep = 1
          this.impulse('body', 8)
          this.impulse('head', 5)
          this.impulse('ant2', 7)
          this.want('perk', 'delighted')
        } else if (k > 0.85) {
          this.want('idle', 'normal')
        }
        break
      }
      case 'doze': {
        // Nods off standing up, then wakes with a start. The best one.
        if (k < 0.75) {
          this.want('doze', 'asleep')
        } else if (this.idleStep === 0) {
          this.idleStep = 1
          this.impulse('body', 7)
          this.impulse('ant2', 6)
          this.want('perk', 'surprised')
        }
        break
      }
      case 'chaseDust': {
        const m = this.dustTarget
        if (!m || m.life < 1) {
          this.cancelIdle(nowMs)
          return
        }
        const d = distance(this.world, m.pos)
        if (d > 0.06) {
          // Walk to it — reuse the wander mover by borrowing its target.
          this.wanderTarget = { ...m.pos }
          this.pauseUntil = 0
          this.want('perk', 'normal')
        } else {
          // Pounce. The mote pops and drifts away, which is the joke: it never wins.
          this.impulse('body', 9)
          popMote(m)
          this.want('perk', 'delighted')
          this.dustTarget = null
          this.wanderTarget = null
          this.pauseUntil = nowMs + 900
          this.idleT = this.idleDur // end it
        }
        break
      }
    }

    if (this.idleT >= this.idleDur) {
      this.want('idle', 'normal')
      this.cancelIdle(nowMs)
    }
  }

  private want(pose: PoseName, face: Face): void {
    if (this.poseTo !== pose) this.setPose(pose)
    this.face = face
  }

  /**
   * Wandering. This is what makes it feel like it has a life rather than being parked
   * in the middle of the screen waiting for you — and it's the groundwork for the locked
   * dependent→independent arc, where the adult has its own agenda.
   */
  private updateWorld(dtMs: number, nowMs: number): void {
    const prevX = this.world.x

    if (this.greeting) {
      // Depth is driven by the greeting's own approach curve.
      const k = ease(this.approach)
      this.world = {
        x: this.greetFrom.x + (GREETING_SPOT.x - this.greetFrom.x) * k,
        y: this.greetFrom.y + (GREETING_SPOT.y - this.greetFrom.y) * k,
      }
      this.walking = k > 0 && k < 1
    } else if (this.grabbing) {
      this.walking = false
    } else if (nowMs < this.pauseUntil) {
      this.walking = false
    } else {
      if (!this.wanderTarget) this.wanderTarget = randomWanderTarget()
      const target = this.wanderTarget
      const d = distance(this.world, target)
      if (d < WANDER.arriveEpsilon) {
        this.wanderTarget = null
        this.pauseUntil =
          nowMs + randBetween(WANDER.pauseMs[0], WANDER.pauseMs[1])
        this.walking = false
      } else {
        const step = (WANDER.speed * dtMs) / 1000
        const k = Math.min(1, step / d)
        this.world = {
          x: this.world.x + (target.x - this.world.x) * k,
          y: this.world.y + (target.y - this.world.y) * k,
        }
        this.walking = true
        // A little hop per step reads as walking without needing a leg cycle — and the
        // rig's own landing squash does the rest for free.
        if (nowMs - this.lastHopAt > WANDER.hopEveryMs) {
          this.lastHopAt = nowMs
          this.impulse('body', 2.6)
        }
      }
    }

    const dx = this.world.x - prevX
    if (Math.abs(dx) > 0.0015) this.facing = dx > 0 ? 1 : -1
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
