import { Application, Container, Graphics, Text } from 'pixi.js'
import { PALETTE } from './style/palette'
import { RIG } from './style/motion'
import { Rig } from './rig/verlet'
import { BABY } from './rig/skeleton'
import { poseTargets } from './rig/poses'
import { Behaviour } from './pet/behaviours'
import { drawPet } from './pet/render'
import { greetingFor } from './pet/greeting'
import { drawGround, drawShadow, roomColours, timeOfDay } from './room/scene'
import { makeGround, worldToScreen, type Ground } from './world/ground'
import { load, save, type Save } from './persist/store'
import { absenceOverrideMs } from './time/clock'
import { setUpBedtimeNotification } from './notify/capacitor'

const STEP_MS = 1000 / RIG.fixedStepHz
const STEP_S = STEP_MS / 1000

async function boot(): Promise<void> {
  const now = Date.now()
  const { save: state } = load(now)

  const app = new Application()
  await app.init({
    background: PALETTE.roomDay,
    resizeTo: window,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  })
  document.getElementById('app')!.appendChild(app.canvas)

  const world = new Container()
  app.stage.addChild(world)

  const groundG = new Graphics()
  const shadowG = new Graphics()
  world.addChild(groundG, shadowG)

  const petBox = new Container()
  const petG = new Graphics()
  petBox.addChild(petG)
  world.addChild(petBox)

  let ground: Ground = makeGround(app.screen.width, app.screen.height)

  const rig = new Rig(
    BABY.points.map((p) => ({ ...p })),
    BABY.bones.map((b) => ({ ...b })),
    [],
    0,
  )
  rig.pose = poseTargets('idle', (n) => rig.index(n))

  function layout(): void {
    // app.screen is the logical drawing area. renderer.width is NOT the same thing and
    // dividing it by resolution silently renders everything at quarter size.
    ground = makeGround(app.screen.width, app.screen.height)
    const tod = timeOfDay(new Date())
    drawGround(groundG, ground, tod)
    app.renderer.background.color = roomColours(tod).sky
  }

  layout()
  const behaviour = new Behaviour(rig)

  // Seed the rig at its rest pose on the ground, so the first frame isn't a creature
  // falling from orbit.
  function placeRig(): { x: number; y: number; scale: number } {
    const p = worldToScreen(ground, behaviour.world)
    rig.rootX = p.x
    rig.rootY = p.y
    rig.floorY = p.y
    return p
  }
  {
    const p = placeRig()
    for (const q of rig.points) {
      const t = BABY.points.find((b) => b.name === q.name)!
      q.x = q.px = p.x + t.x
      q.y = q.py = p.y + t.y
    }
  }

  window.addEventListener('resize', layout)

  // --- the greeting -------------------------------------------------------
  const override = absenceOverrideMs(location.search)
  const effectiveLastSeen = override !== null ? now - override : state.lastSeen
  const spec = greetingFor(effectiveLastSeen, now)
  behaviour.playGreeting(spec)

  // A visit counts only if it was a real return — tier 'trot' (1h+) or better. Counting
  // every launch meant a compulsive checker could refresh 300 times and age the pet to
  // adulthood in an afternoon, which contradicts both the anti-compulsion thesis and the
  // "lifespan can't be gamed" decision. Reopening the app twice in a minute is one visit.
  if (spec.rank >= 2) state.visits += 1

  // --- input: grab, drag, shake, drop -------------------------------------
  app.stage.eventMode = 'static'
  app.stage.hitArea = { contains: () => true }

  function toRigSpace(gx: number, gy: number): { x: number; y: number } {
    const sx = petBox.scale.x || 1
    const sy = petBox.scale.y || 1
    return {
      x: rig.rootX + (gx - petBox.x) / Math.abs(sx),
      y: rig.rootY + (gy - petBox.y) / sy,
    }
  }

  app.stage.on('pointerdown', (e) => {
    const local = toRigSpace(e.global.x, e.global.y)
    let best = -1
    let bestD = Infinity
    rig.points.forEach((p, i) => {
      const d = Math.hypot(p.x - local.x, p.y - local.y)
      if (d < p.radius + 26 && d < bestD) {
        bestD = d
        best = i
      }
    })
    if (best < 0) return
    rig.grabbed = best
    rig.grabX = local.x
    rig.grabY = local.y
    behaviour.onGrabStart()
  })

  app.stage.on('pointermove', (e) => {
    if (rig.grabbed < 0) return
    const local = toRigSpace(e.global.x, e.global.y)
    rig.grabX = local.x
    rig.grabY = local.y
    // Carry the pet across the ground plane with the finger. Depth is held fixed —
    // screen-y while lifted means height, not distance, and conflating them feels wrong.
    behaviour.dragTo(ground, e.global.x)
    behaviour.onGrabMove(e.global.x, performance.now())
  })

  const release = (): void => {
    if (rig.grabbed < 0) return
    rig.grabbed = -1
    behaviour.onGrabEnd(performance.now())
  }
  app.stage.on('pointerup', release)
  app.stage.on('pointerupoutside', release)

  // --- debug overlay ------------------------------------------------------
  const debug = location.search.includes('debug')
  let dbg: Text | null = null
  if (debug) {
    dbg = new Text({
      text: '',
      style: { fill: PALETTE.uiText, fontSize: 14, fontFamily: 'monospace' },
    })
    dbg.position.set(12, 12)
    world.addChild(dbg)
  }

  // Deliberate test hook. Feels like cheating; isn't — it makes the pet testable, and
  // that's a property worth having. See scripts/test.mjs.
  ;(window as unknown as Record<string, unknown>).__tamati = {
    ready: false,
    tier: spec.tier,
    get rig() {
      return rig.points.map((p) => ({ name: p.name, x: p.x, y: p.y }))
    },
    get face() {
      return behaviour.face
    },
    get greetingActive() {
      return behaviour.greetingActive
    },
    get grabbing() {
      return behaviour.grabbing
    },
    get shaking() {
      return behaviour.shaking
    },
    get shakeFlips() {
      return behaviour.shakeFlips
    },
    get shakeSampleCount() {
      return behaviour.shakeSampleCount
    },
    get world() {
      return { ...behaviour.world }
    },
    get walking() {
      return behaviour.walking
    },
    get lift() {
      return liftPx
    },
    cpuMs: 0,
  }

  // --- fixed-step loop ----------------------------------------------------
  let acc = 0
  let fpsAvg = 60
  let firstFrameDone = false
  let liftPx = 0
  const hook = (window as unknown as Record<string, { ready: boolean; cpuMs: number }>).__tamati

  app.ticker.add((ticker) => {
    const cpu0 = performance.now()
    const dt = Math.min(ticker.elapsedMS, 100) // never let a stalled tab explode the sim
    const t = performance.now()

    // Behaviour moves the pet across the ground first, then the rig is placed there and
    // simulated. That ordering is what makes the body trail behind the walk.
    behaviour.update(dt, t)
    const p = placeRig()

    acc += dt
    let steps = 0
    while (acc >= STEP_MS && steps < 5) {
      rig.step(STEP_S)
      acc -= STEP_MS
      steps++
    }

    // How far off the ground it is, for the shadow. Without this a hop reads as the pet
    // simply getting bigger.
    let lowest = -Infinity
    for (const q of rig.points) lowest = Math.max(lowest, q.y + q.radius)
    liftPx = Math.max(0, rig.floorY - lowest)

    drawShadow(shadowG, ground, behaviour.world, liftPx * p.scale)

    const sq = behaviour.squashScale()
    const br = behaviour.breathe(t)
    const jitter = behaviour.shakePx ? (Math.random() - 0.5) * 2 * behaviour.shakePx : 0
    petBox.x = p.x + jitter
    petBox.y = p.y + jitter
    petBox.scale.set(p.scale * sq.x, p.scale * sq.y * br)
    // Lean into the direction of travel. Cheap, and it stops walking looking like sliding.
    petBox.rotation = behaviour.walking ? behaviour.facing * 0.05 : 0

    drawPet(petG, rig, behaviour.face)

    hook.cpuMs = performance.now() - cpu0

    if (!firstFrameDone) {
      firstFrameDone = true
      hook.ready = true
      performance.mark('tamati-first-greeting-frame')
    }

    if (dbg) {
      fpsAvg = fpsAvg * 0.95 + ticker.FPS * 0.05
      dbg.text =
        `${fpsAvg.toFixed(0)} fps · ${spec.tier} · visits ${state.visits}\n` +
        `world ${behaviour.world.x.toFixed(2)},${behaviour.world.y.toFixed(2)} ` +
        `${behaviour.walking ? 'walking' : 'still'} lift ${liftPx.toFixed(0)}`
    }
  })

  // --- persistence --------------------------------------------------------
  const persist = (): void => {
    const s: Save = { ...state, lastSeen: Date.now() }
    save(s)
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist()
  })
  window.addEventListener('pagehide', persist)
  persist()

  // Reschedule the one notification on every open. No-ops on web.
  void setUpBedtimeNotification()
}

boot()
