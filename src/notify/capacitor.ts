// The native edge. Everything above this file is platform-agnostic and tested; this
// bit cannot be exercised outside a real device, so it is kept as thin as possible.

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { rescheduleBedtime, type NotificationBackend } from './bedtime'

const backend: NotificationBackend = {
  async cancel(ids) {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
  },
  async schedule({ id, title, body, at }) {
    await LocalNotifications.schedule({
      notifications: [{ id, title, body, schedule: { at, allowWhileIdle: true } }],
    })
  },
}

/**
 * Called once per app open. No-ops on web, which keeps `npm run dev` on Linux working
 * exactly as before.
 *
 * Permission is requested silently and a refusal is accepted without a second ask — a
 * nag screen for the one notification that exists to tell you to stop looking at your
 * phone would be self-defeating.
 */
export async function setUpBedtimeNotification(now: Date = new Date()): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
      const asked = await LocalNotifications.requestPermissions()
      if (asked.display !== 'granted') return
    } else if (perm.display !== 'granted') {
      return
    }
    await rescheduleBedtime(backend, now)
  } catch {
    // A pet that won't animate because a notification failed to schedule is worse than
    // a pet with no notification.
  }
}
