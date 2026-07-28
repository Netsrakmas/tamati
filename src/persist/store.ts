// Versioned localStorage. No accounts, no backend, no network — locked decision.
// Migration lands properly in M6; the version field and the migrate seam exist now so
// that a v1 save is never orphaned.

const KEY = 'tamati.save'
const VERSION = 1

export interface Save {
  version: number
  /** Epoch ms of the last time the app was closed/backgrounded. */
  lastSeen: number
  /** Lifespan is counted in visits, not calendar days — see PROJECT.md. */
  visits: number
}

function fresh(now: number): Save {
  // A first-ever launch is not an absence. Seed lastSeen to now so the first greeting is
  // 'glance', not a fake six-hour reunion with someone you've never met.
  return { version: VERSION, lastSeen: now, visits: 0 }
}

function migrate(raw: unknown, now: number): Save {
  if (!raw || typeof raw !== 'object') return fresh(now)
  const s = raw as Partial<Save>
  if (typeof s.lastSeen !== 'number' || typeof s.visits !== 'number') return fresh(now)
  // Future versions chain their migrations here.
  return { version: VERSION, lastSeen: s.lastSeen, visits: s.visits }
}

export function load(now: number): { save: Save; firstRun: boolean } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return { save: fresh(now), firstRun: true }
    return { save: migrate(JSON.parse(raw), now), firstRun: false }
  } catch {
    // Private browsing, quota, corrupt JSON — never let storage break the pet.
    return { save: fresh(now), firstRun: true }
  }
}

export function save(s: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore — a pet that won't animate because of a quota error is worse than a lost save */
  }
}
