// Real time, and the debug time-scale the spec's open questions asked for.
// PROMPT.md §8: visits-per-stage pacing can't be honestly playtested at real length,
// so M4 needs a way to compress it. The seam goes in now.

export interface Clock {
  now(): number
}

export const realClock: Clock = { now: () => Date.now() }

/**
 * Debug clock. `?fastforward=6h` on the URL pretends the last visit was that long ago,
 * which is the only practical way to see the 6h+ greeting without waiting six hours.
 */
export function absenceOverrideMs(search: string): number | null {
  const m = /[?&]fastforward=(\d+)(m|h|d)/.exec(search)
  if (!m) return null
  const n = Number(m[1])
  const unit = m[2]
  const mult = unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000
  return n * mult
}
