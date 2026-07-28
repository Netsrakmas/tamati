// The one notification. See PROMPT.md §5 — exactly one push exists, at bedtime, and its
// entire purpose is to tell you to put the phone down.
//
// Local notifications are genuinely local: no server, no push service, no account. That
// is the whole reason the native decision kept the no-backend lock intact.
//
// The scheduling maths is pure and lives here so it can be tested on any platform. The
// Capacitor call is a thin edge at the bottom.

import { SLEEP_WINDOW } from '../style/motion'

export const BEDTIME_NOTIFICATION_ID = 1

/** The only notification text in the entire app. */
export const BEDTIME_TEXT = {
  title: 'Tamati',
  body: 'Tamati went to sleep.',
} as const

/**
 * Next occurrence of the sleep hour in local time.
 *
 * Deliberately NOT using the plugin's `repeats` flag: repeating daily at a fixed
 * time-of-day is poorly documented on iOS and reported as unreliable. Rescheduling one
 * single notification each time the app opens is both more dependable and more correct —
 * the sleep window should track the user's real clock, and a visit is exactly when we
 * know what that is.
 */
export function nextBedtimeAt(now: Date, startHour: number = SLEEP_WINDOW.startHour): Date {
  const at = new Date(now.getTime())
  at.setHours(startHour, 0, 0, 0)
  if (at.getTime() <= now.getTime()) {
    at.setDate(at.getDate() + 1)
    // setDate can land on a DST boundary and drag the hour with it; pin it back.
    at.setHours(startHour, 0, 0, 0)
  }
  return at
}

/** Minimal shape of the plugin we depend on, so tests need no native runtime. */
export interface NotificationBackend {
  cancel(ids: number[]): Promise<void>
  schedule(n: { id: number; title: string; body: string; at: Date }): Promise<void>
}

/**
 * Cancel-then-reschedule. Called on every app open, so the notification always points at
 * the next bedtime and never accumulates duplicates.
 */
export async function rescheduleBedtime(
  backend: NotificationBackend,
  now: Date,
  startHour: number = SLEEP_WINDOW.startHour,
): Promise<Date> {
  const at = nextBedtimeAt(now, startHour)
  await backend.cancel([BEDTIME_NOTIFICATION_ID])
  await backend.schedule({
    id: BEDTIME_NOTIFICATION_ID,
    title: BEDTIME_TEXT.title,
    body: BEDTIME_TEXT.body,
    at,
  })
  return at
}
