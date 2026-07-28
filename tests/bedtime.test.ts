import { describe, expect, it, vi } from 'vitest'
import {
  BEDTIME_NOTIFICATION_ID,
  BEDTIME_TEXT,
  nextBedtimeAt,
  rescheduleBedtime,
  type NotificationBackend,
} from '../src/notify/bedtime'

function fakeBackend() {
  const cancelled: number[][] = []
  const scheduled: Array<{ id: number; title: string; body: string; at: Date }> = []
  const backend: NotificationBackend = {
    cancel: vi.fn(async (ids) => {
      cancelled.push(ids)
    }),
    schedule: vi.fn(async (n) => {
      scheduled.push(n)
    }),
  }
  return { backend, cancelled, scheduled }
}

describe('bedtime scheduling', () => {
  it('schedules tonight when it is still before bedtime', () => {
    const at = nextBedtimeAt(new Date(2026, 6, 28, 14, 30), 22)
    expect(at.getDate()).toBe(28)
    expect(at.getHours()).toBe(22)
    expect(at.getMinutes()).toBe(0)
  })

  it('rolls to tomorrow when bedtime has already passed', () => {
    const at = nextBedtimeAt(new Date(2026, 6, 28, 23, 15), 22)
    expect(at.getDate()).toBe(29)
    expect(at.getHours()).toBe(22)
  })

  it('rolls to tomorrow in the small hours, not back to tonight', () => {
    // 01:00 — the pet is asleep. The next bedtime is tonight at 22:00, same date.
    const at = nextBedtimeAt(new Date(2026, 6, 28, 1, 0), 22)
    expect(at.getDate()).toBe(28)
    expect(at.getHours()).toBe(22)
  })

  it('treats exactly bedtime as already passed', () => {
    const at = nextBedtimeAt(new Date(2026, 6, 28, 22, 0, 0, 0), 22)
    expect(at.getDate()).toBe(29)
  })

  it('lands on the right hour across a month boundary', () => {
    const at = nextBedtimeAt(new Date(2026, 6, 31, 23, 0), 22)
    expect(at.getMonth()).toBe(7)
    expect(at.getDate()).toBe(1)
    expect(at.getHours()).toBe(22)
  })

  it('always produces a future time, for every hour of the day', () => {
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30, 59]) {
        const now = new Date(2026, 6, 28, h, m)
        const at = nextBedtimeAt(now, 22)
        expect(at.getTime()).toBeGreaterThan(now.getTime())
        expect(at.getHours()).toBe(22)
      }
    }
  })

  it('never schedules more than 24h out', () => {
    for (let h = 0; h < 24; h++) {
      const now = new Date(2026, 6, 28, h, 0)
      const gap = nextBedtimeAt(now, 22).getTime() - now.getTime()
      expect(gap).toBeLessThanOrEqual(24 * 3600_000)
    }
  })

  it('cancels before scheduling so notifications cannot accumulate', async () => {
    const { backend, cancelled, scheduled } = fakeBackend()
    await rescheduleBedtime(backend, new Date(2026, 6, 28, 9, 0), 22)
    await rescheduleBedtime(backend, new Date(2026, 6, 28, 10, 0), 22)
    expect(cancelled).toEqual([[BEDTIME_NOTIFICATION_ID], [BEDTIME_NOTIFICATION_ID]])
    expect(scheduled).toHaveLength(2)
    expect(scheduled.every((s) => s.id === BEDTIME_NOTIFICATION_ID)).toBe(true)
  })

  it('sends exactly the one sanctioned message and nothing else', async () => {
    const { backend, scheduled } = fakeBackend()
    await rescheduleBedtime(backend, new Date(2026, 6, 28, 9, 0), 22)
    expect(scheduled).toHaveLength(1)
    expect(scheduled[0].title).toBe(BEDTIME_TEXT.title)
    expect(scheduled[0].body).toBe('Tamati went to sleep.')
    // No guilt, no nagging, no exclamation marks. The forbidden list is not decorative.
    expect(scheduled[0].body).not.toMatch(/miss|come back|!|\bplay\b|hungry|dirty/i)
  })
})
