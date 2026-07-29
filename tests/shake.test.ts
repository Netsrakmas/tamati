import { describe, expect, it } from 'vitest'
import { Rig } from '../src/rig/verlet'
import { BABY } from '../src/rig/skeleton'
import { Behaviour } from '../src/pet/behaviours'
import { SHAKE } from '../src/style/motion'

function makeBehaviour(): Behaviour {
  const rig = new Rig(
    BABY.points.map((p) => ({ ...p })),
    BABY.bones.map((b) => ({ ...b })),
    [],
    600,
  )
  rig.rootX = 300
  rig.rootY = 600
  return new Behaviour(rig)
}

/** Feed a gesture through the real handler at a given sample rate. */
function gesture(
  b: Behaviour,
  xAt: (tMs: number) => number,
  durationMs: number,
  sampleHz: number,
): void {
  b.onGrabStart()
  const stepMs = 1000 / sampleHz
  for (let t = 0; t <= durationMs; t += stepMs) {
    b.onGrabMove(xAt(t), t)
  }
}

describe('shake detection', () => {
  it('fires on a realistic 4Hz hand shake', () => {
    const b = makeBehaviour()
    gesture(b, (t) => 300 + 80 * Math.sin(2 * Math.PI * 4 * (t / 1000)), 800, 60)
    expect(b.shaking).toBe(true)
    expect(b.face).toBe('delighted')
  })

  it('still fires at the slow end of human shaking (3Hz)', () => {
    const b = makeBehaviour()
    gesture(b, (t) => 300 + 70 * Math.sin(2 * Math.PI * 3 * (t / 1000)), 900, 60)
    expect(b.shaking).toBe(true)
  })

  it('is sample-rate independent — the same gesture reads the same at 30Hz and 120Hz', () => {
    const wave = (t: number) => 300 + 80 * Math.sin(2 * Math.PI * 4 * (t / 1000))
    for (const hz of [30, 60, 120, 240]) {
      const b = makeBehaviour()
      gesture(b, wave, 800, hz)
      expect(b.shaking, `${hz}Hz should read as a shake`).toBe(true)
    }
  })

  it('ignores a trembling finger — high frequency, tiny amplitude', () => {
    const b = makeBehaviour()
    gesture(b, (t) => 300 + 4 * Math.sin(2 * Math.PI * 9 * (t / 1000)), 800, 60)
    expect(b.shaking).toBe(false)
  })

  it('ignores a plain drag across the screen', () => {
    const b = makeBehaviour()
    gesture(b, (t) => 100 + t * 0.4, 800, 60)
    expect(b.shaking).toBe(false)
  })

  it('ignores a single slow there-and-back', () => {
    const b = makeBehaviour()
    gesture(b, (t) => 300 + 120 * Math.sin(2 * Math.PI * 0.8 * (t / 1000)), 800, 60)
    expect(b.shaking).toBe(false)
  })

  it('forgets a shake once it falls out of the window', () => {
    const b = makeBehaviour()
    gesture(b, (t) => 300 + 80 * Math.sin(2 * Math.PI * 4 * (t / 1000)), 800, 60)
    expect(b.shaking).toBe(true)
    // Hold still for longer than the window, still holding on.
    for (let t = 800; t <= 800 + SHAKE.windowMs + 200; t += 16) b.onGrabMove(300, t)
    expect(b.shaking).toBe(false)
  })

  it('leaves the baby wanting more after a shake, but not after a plain drag', () => {
    const shaken = makeBehaviour()
    gesture(shaken, (t) => 300 + 80 * Math.sin(2 * Math.PI * 4 * (t / 1000)), 800, 60)
    shaken.onGrabEnd(800)
    shaken.update(16, 900)
    expect(shaken.face).toBe('happy')

    const dragged = makeBehaviour()
    gesture(dragged, (t) => 100 + t * 0.4, 800, 60)
    dragged.onGrabEnd(800)
    dragged.update(16, 900)
    expect(dragged.face).not.toBe('happy')
  })
})
