// The world: a receding ground plane with a background above the horizon, lit by the
// real time of day. Room dressing proper lands in M2 — this is the surface the pet
// wanders on, nothing more.

import { Graphics } from 'pixi.js'
import { PALETTE } from '../style/palette'
import type { Ground, WorldPos } from '../world/ground'
import { depthScale, worldToScreen } from '../world/ground'

export type TimeOfDay = 'day' | 'dusk' | 'night'

export function timeOfDay(date: Date): TimeOfDay {
  const h = date.getHours()
  if (h >= 21 || h < 7) return 'night'
  if (h >= 17) return 'dusk'
  return 'day'
}

export function roomColours(tod: TimeOfDay): { sky: number; ground: number } {
  switch (tod) {
    case 'night':
      return { sky: PALETTE.roomNight, ground: PALETTE.floorNight }
    case 'dusk':
      return { sky: PALETTE.roomDusk, ground: PALETTE.floorDay }
    default:
      return { sky: PALETTE.roomDay, ground: PALETTE.floorDay }
  }
}

export function drawGround(g: Graphics, ground: Ground, tod: TimeOfDay): void {
  const { sky, ground: floor } = roomColours(tod)
  const { screenW: w, screenH: h, horizonY } = ground

  g.clear()
  g.rect(0, 0, w, horizonY).fill({ color: sky })
  g.rect(0, horizonY, w, h - horizonY).fill({ color: floor })

  // A soft band at the horizon so the two planes meet rather than butt together.
  g.rect(0, horizonY, w, 6).fill({ color: PALETTE.uiMuted, alpha: 0.18 })

  // Faint depth bands. Spaced by the same foreshortening as the pet, so walking
  // "into" the screen reads as depth rather than as sliding upward.
  for (let i = 1; i <= 5; i++) {
    const y = i / 6
    const py = horizonY + y * (h - horizonY)
    g.rect(0, py, w, 1).fill({ color: PALETTE.uiMuted, alpha: 0.07 })
  }
}

/**
 * Contact shadow. It is the only thing that says whether the pet is standing on the
 * ground or in the air — without it a hop just looks like the pet growing.
 *
 * @param lift height above the surface in px (0 = touching)
 */
export function drawShadow(g: Graphics, ground: Ground, at: WorldPos, lift: number): void {
  const p = worldToScreen(ground, at)
  const s = depthScale(at.y)
  const h = Math.max(0, lift)
  // Higher up → smaller and fainter, which reads as further from the surface.
  const shrink = Math.max(0.45, 1 - h / 220)
  g.clear()
  g.ellipse(p.x, p.y, 46 * s * shrink, 14 * s * shrink).fill({
    color: PALETTE.petInk,
    alpha: 0.22 * shrink,
  })
}
