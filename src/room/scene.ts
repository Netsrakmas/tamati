// One room, a floor, and time-of-day light. Room dressing proper lands in M2 — this is
// only enough that the pet isn't floating in a void.

import { Graphics } from 'pixi.js'
import { PALETTE } from '../style/palette'

export type TimeOfDay = 'day' | 'dusk' | 'night'

export function timeOfDay(date: Date): TimeOfDay {
  const h = date.getHours()
  if (h >= 21 || h < 7) return 'night'
  if (h >= 17) return 'dusk'
  return 'day'
}

export function roomColours(tod: TimeOfDay): { wall: number; floor: number } {
  switch (tod) {
    case 'night':
      return { wall: PALETTE.roomNight, floor: PALETTE.floorNight }
    case 'dusk':
      return { wall: PALETTE.roomDusk, floor: PALETTE.floorDay }
    default:
      return { wall: PALETTE.roomDay, floor: PALETTE.floorDay }
  }
}

export function drawRoom(g: Graphics, w: number, h: number, floorY: number, tod: TimeOfDay): void {
  const { wall, floor } = roomColours(tod)
  g.clear()
  g.rect(0, 0, w, h).fill({ color: wall })
  g.rect(0, floorY, w, h - floorY).fill({ color: floor })
  // A soft contact shadow band, so the pet reads as standing on something.
  g.rect(0, floorY, w, 3).fill({ color: PALETTE.uiMuted, alpha: 0.25 })
}
