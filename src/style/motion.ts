// LOCKED — see PROMPT.md §3.4. Every motion tunable lives here and nowhere else.

export const RIG = {
  fixedStepHz: 60,
  constraintIterations: 8, // chain topology converges faster than cloth (5–15)
  damping: 0.96,
  gravity: 1400, // px/s²
  maxStretchRatio: 1.4, // per bone, vs rest length
  grabSpringK: 0.35,
} as const

export const SQUASH = {
  // "feel it, don't see it" is the studio rule. Baby BREAKS it on purpose — the
  // exaggeration is the joke. Adult converges on it. The principle IS the aging curve.
  baby: { landY: 0.7, landX: 1.3 },
  kid: { landY: 0.78, landX: 1.18 },
  teen: { landY: 0.86, landX: 1.1 },
  adult: { landY: 0.92, landX: 1.05 },
  recoverMs: 180,
  overshoot: { y: 1.06, x: 0.95 },
} as const

export const IDLE = {
  breathHz: 0.6,
  breathAmp: 0.03, // ±3% scaleY
  blinkEveryMs: [3000, 7000] as const,
  blinkDurMs: 120,
} as const

export const SHAKE = {
  /** A human shakes at roughly 3–5Hz, i.e. 6–10 direction changes per second. */
  windowMs: 600,
  /** 3 reversals in 600ms ≈ 2.5Hz — the slowest thing that still reads as shaking. */
  minReversals: 3,
  /** px. Guards against a trembling finger registering as a shake. */
  minSwingPx: 35,
} as const

/** Sleep window, local time. Out of M1 scope for behaviour; defined here so it lives in one place. */
export const SLEEP_WINDOW = { startHour: 22, endHour: 7 } as const
