// The 3/4 top-down ground plane.
//
// NOT bird's-eye. Looking straight down would show the pet's back, and the face is the
// entire emotional instrument — the whole clown-to-deadpan arc is carried by it. So the
// ground recedes while the pet stays front-facing, the way Stardew and Zelda do it.
//
// World space: x ∈ [-1, 1] left→right, y ∈ [0, 1] far→near. Screen space is derived.
// Keeping them separate is what lets the pet wander in depth without the rig knowing.

export interface Ground {
  horizonY: number
  screenW: number
  screenH: number
}

export interface WorldPos {
  x: number
  y: number
}

export function makeGround(screenW: number, screenH: number): Ground {
  return { horizonY: Math.round(screenH * 0.24), screenW, screenH }
}

/** Depth foreshortening: things at the back are smaller and closer together. */
export function depthScale(y: number): number {
  return 0.62 + 0.38 * clamp01(y)
}

export function worldToScreen(g: Ground, p: WorldPos): { x: number; y: number; scale: number } {
  const y = clamp01(p.y)
  const s = depthScale(y)
  return {
    // The plane narrows toward the horizon, which is what sells it as a receding surface.
    x: g.screenW / 2 + p.x * (g.screenW / 2) * (0.45 + 0.55 * y),
    y: g.horizonY + y * (g.screenH - g.horizonY),
    scale: s,
  }
}

/** Inverse of worldToScreen's x, at a known depth. Used when dragging the pet around. */
export function screenToWorldX(g: Ground, screenX: number, atY: number): number {
  const y = clamp01(atY)
  const halfSpan = (g.screenW / 2) * (0.45 + 0.55 * y)
  const x = (screenX - g.screenW / 2) / (halfSpan || 1)
  return x < -1 ? -1 : x > 1 ? 1 : x
}

/**
 * Somewhere sensible to wander to. Kept away from the very back (the pet would be tiny
 * and its face unreadable) and off the extreme edges.
 */
export function randomWanderTarget(rand: () => number = Math.random): WorldPos {
  return { x: (rand() * 2 - 1) * 0.72, y: 0.32 + rand() * 0.6 }
}

/** Where the pet stands to greet you: near the camera, roughly centred. */
export const GREETING_SPOT: WorldPos = { x: 0, y: 0.86 }

export function distance(a: WorldPos, b: WorldPos): number {
  // Depth is foreshortened on screen, so weight it or diagonal walks look wrong.
  return Math.hypot(a.x - b.x, (a.y - b.y) * 1.6)
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
