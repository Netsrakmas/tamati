// Draws the baby from live rig positions every frame. No sprites — M1 predates the art
// phase deliberately, and procedural shapes are enough to answer the kill-gate question.
//
// Everything is drawn relative to the rig root so the container can be scaled about the
// feet for squash and stretch.

import { Graphics } from 'pixi.js'
import { PALETTE } from '../style/palette'
import { EYE } from '../rig/skeleton'
import type { Rig } from '../rig/verlet'
import type { Face } from './behaviours'

export function drawPet(g: Graphics, rig: Rig, face: Face): void {
  g.clear()

  const rx = rig.rootX
  const ry = rig.rootY
  const p = (name: string) => {
    const pt = rig.point(name)
    return { x: pt.x - rx, y: pt.y - ry, r: pt.radius }
  }

  const body = p('body')
  const head = p('head')
  const armL = p('armL')
  const armR = p('armR')
  const legL = p('legL')
  const legR = p('legR')
  const a1 = p('ant1')
  const a2 = p('ant2')

  // Head tilt follows the body→head vector — free expressiveness from the sim.
  const tilt = Math.atan2(head.x - body.x, -(head.y - body.y))

  // --- limbs behind ------------------------------------------------------
  for (const l of [legL, legR, armL, armR]) {
    g.circle(l.x, l.y, l.r).fill({ color: PALETTE.petShade })
  }

  // --- antenna -----------------------------------------------------------
  g.moveTo(head.x, head.y - head.r * 0.8)
    .quadraticCurveTo(a1.x, a1.y, a2.x, a2.y)
    .stroke({ width: 7, color: PALETTE.petShade, cap: 'round' })
  g.circle(a2.x, a2.y, a2.r).fill({ color: PALETTE.petBelly })

  // --- body --------------------------------------------------------------
  g.circle(body.x, body.y, body.r).fill({ color: PALETTE.petBody })
  g.ellipse(body.x, body.y + body.r * 0.22, body.r * 0.62, body.r * 0.52).fill({
    color: PALETTE.petBelly,
  })

  // --- head --------------------------------------------------------------
  g.circle(head.x, head.y, head.r).fill({ color: PALETTE.petBody })

  // --- face --------------------------------------------------------------
  const ex = EYE.offsetX
  const ey = EYE.offsetY
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  const at = (ox: number, oy: number) => ({
    x: head.x + ox * cos - oy * sin,
    y: head.y + ox * sin + oy * cos,
  })

  const left = at(-ex, ey)
  const right = at(ex, ey)
  const mouth = at(0, ey + 30)
  // Cheeks sit outboard of the eyes, not under them. Blush also needs to stay opaque —
  // salmon at low alpha over the teal body blends to a muddy grey and reads as dirt.
  const cheekL = at(-(ex + 12), ey + 22)
  const cheekR = at(ex + 12, ey + 22)

  if (face === 'blink' || face === 'asleep') {
    for (const e of [left, right]) {
      g.moveTo(e.x - EYE.radius, e.y)
        .lineTo(e.x + EYE.radius, e.y)
        .stroke({ width: 4, color: PALETTE.petInk, cap: 'round' })
    }
  } else if (face === 'annoyed') {
    // Half-lidded: a lid drawn across the top of each eye. Reads as "I have had enough
    // of you" without needing brows.
    for (const e of [left, right]) {
      g.circle(e.x, e.y + 3, EYE.radius * 0.82).fill({ color: PALETTE.petInk })
      g.moveTo(e.x - EYE.radius - 2, e.y - 2)
        .lineTo(e.x + EYE.radius + 2, e.y - 5)
        .stroke({ width: 6, color: PALETTE.petBody, cap: 'round' })
    }
  } else if (face === 'surprised') {
    for (const e of [left, right]) {
      g.circle(e.x, e.y, EYE.radius * 1.22).fill({ color: PALETTE.petInk })
      g.circle(e.x + 4, e.y - 4, EYE.radius * 0.4).fill({ color: PALETTE.petBelly })
    }
  } else if (face === 'happy' || face === 'delighted' || face === 'joy') {
    // ^ ^ — the arcs are the whole difference between "a shape" and "pleased to see you"
    for (const e of [left, right]) {
      g.moveTo(e.x - EYE.radius, e.y + EYE.radius * 0.5)
        .quadraticCurveTo(e.x, e.y - EYE.radius * 0.9, e.x + EYE.radius, e.y + EYE.radius * 0.5)
        .stroke({ width: 5, color: PALETTE.petInk, cap: 'round' })
    }
  } else {
    for (const e of [left, right]) {
      g.circle(e.x, e.y, EYE.radius).fill({ color: PALETTE.petInk })
      g.circle(e.x + 3, e.y - 3, EYE.radius * 0.34).fill({ color: PALETTE.petBelly })
    }
  }

  if (face === 'delighted' || face === 'joy') {
    g.ellipse(mouth.x, mouth.y, 15, 13).fill({ color: PALETTE.petInk })
    for (const c of [cheekL, cheekR]) {
      g.ellipse(c.x, c.y, 11, 8).fill({ color: PALETTE.petBlush, alpha: 0.9 })
    }
  } else if (face === 'happy') {
    g.moveTo(mouth.x - 12, mouth.y - 3)
      .quadraticCurveTo(mouth.x, mouth.y + 9, mouth.x + 12, mouth.y - 3)
      .stroke({ width: 4, color: PALETTE.petInk, cap: 'round' })
    for (const c of [cheekL, cheekR]) {
      g.ellipse(c.x, c.y, 10, 7).fill({ color: PALETTE.petBlush, alpha: 0.8 })
    }
  } else if (face === 'asleep') {
    // A small sleep bubble. The only thing on screen that is allowed to be a cliché.
    const b = at(30, ey - 6)
    g.circle(b.x, b.y, 7).fill({ color: PALETTE.petBelly, alpha: 0.8 })
    g.ellipse(mouth.x, mouth.y + 2, 6, 5).fill({ color: PALETTE.petInk, alpha: 0.75 })
  } else if (face === 'surprised') {
    g.ellipse(mouth.x, mouth.y, 9, 11).fill({ color: PALETTE.petInk })
  } else if (face === 'annoyed') {
    // A flat line. Doing less is the joke.
    g.moveTo(mouth.x - 10, mouth.y + 2)
      .lineTo(mouth.x + 10, mouth.y + 2)
      .stroke({ width: 4, color: PALETTE.petInk, cap: 'round' })
  } else {
    g.moveTo(mouth.x - 8, mouth.y)
      .quadraticCurveTo(mouth.x, mouth.y + 7, mouth.x + 8, mouth.y)
      .stroke({ width: 4, color: PALETTE.petInk, cap: 'round' })
  }
}
