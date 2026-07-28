// The signature mechanic. See PROMPT.md §3.5.
//
// Compulsive checking must receive LESS reward, never more. That is the ethical stance
// encoded as an animation, and it is why this module is pure and property-tested:
// the tier must never depend on anything but elapsed time.

export type GreetingTier = 'glance' | 'bounce' | 'trot' | 'joy' | 'driftJoy'

export interface GreetingSpec {
  tier: GreetingTier
  durationMs: number
  /** Screen shake amplitude in px. 0 for every tier but full joy. */
  shakePx: number
  shakeMs: number
  /** Ordering index. Strictly increases with absence — the basis of the A9 property test. */
  rank: number
}

const MIN = 60_000
const HOUR = 60 * MIN

/** Ordered ascending by absence. First match from the bottom wins. */
const TIERS: ReadonlyArray<{ minGapMs: number; spec: GreetingSpec }> = [
  {
    minGapMs: 0,
    spec: { tier: 'glance', durationMs: 400, shakePx: 0, shakeMs: 0, rank: 0 },
  },
  {
    minGapMs: 5 * MIN,
    spec: { tier: 'bounce', durationMs: 900, shakePx: 0, shakeMs: 0, rank: 1 },
  },
  {
    minGapMs: 1 * HOUR,
    spec: { tier: 'trot', durationMs: 1600, shakePx: 0, shakeMs: 0, rank: 2 },
  },
  {
    minGapMs: 6 * HOUR,
    spec: { tier: 'joy', durationMs: 2200, shakePx: 6, shakeMs: 300, rank: 3 },
  },
  {
    minGapMs: 72 * HOUR,
    spec: { tier: 'driftJoy', durationMs: 2600, shakePx: 6, shakeMs: 300, rank: 4 },
  },
]

/**
 * Pure. Given when we last saw them and when it is now, which greeting plays.
 *
 * A clock that has gone backwards (device time changed, DST) is clamped to zero rather
 * than treated as a long absence — never reward a wound clock with a bigger greeting.
 */
export function greetingFor(lastSeenMs: number, nowMs: number): GreetingSpec {
  const gap = Math.max(0, nowMs - lastSeenMs)
  let chosen = TIERS[0].spec
  for (const t of TIERS) {
    if (gap >= t.minGapMs) chosen = t.spec
  }
  return chosen
}

/** Exposed for tests and for the debug overlay. */
export const TIER_BOUNDARIES_MS = TIERS.map((t) => t.minGapMs)
