// Saves are local, versioned and validated. Older companions retain their visits.
const KEY = 'tamati.save'
export interface Save {
  version: number
  lastSeen: number
  visits: number
  name: string
  light: 'auto' | 'day' | 'dusk' | 'night'
  sound: boolean
  reducedMotion: boolean
  care: { snack: number; clean: number; play: number }
}
export function fresh(now: number): Save {
  return {
    version: 2,
    lastSeen: now,
    visits: 0,
    name: 'Momo',
    light: 'auto',
    sound: false,
    reducedMotion: false,
    care: { snack: 0, clean: 0, play: 0 },
  }
}
export function migrate(raw: unknown, now: number): Save {
  const base = fresh(now)
  if (!raw || typeof raw !== 'object') return base
  const s = raw as Partial<Save>
  const time = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(v, now) : 0
  return {
    ...base,
    lastSeen: time(s.lastSeen) || now,
    visits:
      typeof s.visits === 'number' && Number.isFinite(s.visits)
        ? Math.max(0, Math.floor(s.visits))
        : 0,
    name:
      typeof s.name === 'string'
        ? s.name.trim().slice(0, 18) || base.name
        : base.name,
    light: ['auto', 'day', 'dusk', 'night'].includes(s.light ?? '')
      ? s.light!
      : 'auto',
    sound: s.sound === true,
    reducedMotion: s.reducedMotion === true,
    care: {
      snack: time(s.care?.snack),
      clean: time(s.care?.clean),
      play: time(s.care?.play),
    },
  }
}
export function load(now: number): { save: Save; firstRun: boolean } {
  try {
    const raw = localStorage.getItem(KEY)
    return {
      save: raw ? migrate(JSON.parse(raw), now) : fresh(now),
      firstRun: raw === null,
    }
  } catch {
    return { save: fresh(now), firstRun: true }
  }
}
export function save(s: Save): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    return true
  } catch {
    return false
  }
}
