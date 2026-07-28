// Baby skeleton. See PROMPT.md §3.3 — head is 55% of total height, three circles,
// no neck, limbs are nubs, eyes wide-set at 22% of head width.
//
// M1 is baby-only. Later stages are proportion drift on this same skeleton, never a
// new character.

/** Root sits at the feet. -y is up. Head top lands at -200, head diameter is 110 → 55%. */
export const BABY_HEIGHT = 200

export const BABY = {
  points: [
    { name: 'body', x: 0, y: -45, invMass: 1, radius: 45 },
    { name: 'head', x: 0, y: -145, invMass: 1, radius: 55 },
    { name: 'armL', x: -50, y: -58, invMass: 1, radius: 16 },
    { name: 'armR', x: 50, y: -58, invMass: 1, radius: 16 },
    { name: 'legL', x: -30, y: -14, invMass: 1, radius: 14 },
    { name: 'legR', x: 30, y: -14, invMass: 1, radius: 14 },
    { name: 'ant1', x: 0, y: -205, invMass: 1, radius: 6 },
    { name: 'ant2', x: 0, y: -238, invMass: 1, radius: 9 },
  ],
  /** Low stiffness on the extremities is what makes shaking it funny. */
  bones: [
    { a: 'body', b: 'head', stiffness: 1 },
    { a: 'body', b: 'armL', stiffness: 0.6 },
    { a: 'body', b: 'armR', stiffness: 0.6 },
    { a: 'body', b: 'legL', stiffness: 0.7 },
    { a: 'body', b: 'legR', stiffness: 0.7 },
    { a: 'head', b: 'ant1', stiffness: 0.5 },
    { a: 'ant1', b: 'ant2', stiffness: 0.35 },
  ],
  /** Head diameter / total height. A5's silhouette check keys off this. */
  headFraction: 110 / BABY_HEIGHT,
} as const

export const EYE = {
  /** 22% of head width (110px), as a radius */
  radius: (0.22 * 110) / 2,
  offsetX: 26,
  offsetY: -10,
} as const
