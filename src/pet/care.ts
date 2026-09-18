import { Graphics } from "pixi.js";
import { PALETTE as C } from "../style/palette";
import type { Save } from "../persist/store";
export type CareAction = "snack" | "clean" | "play";
export const CARE_DURATION: Record<CareAction, number> = {
  snack: 3200,
  clean: 3600,
  play: 4800,
};
export function isSleepTime(date: Date): boolean {
  return date.getHours() >= 22 || date.getHours() < 7;
}
export function hasSettled(care: Save["care"], now: number): boolean {
  return Object.values(care).every((t) => t > 0 && now - t < 18 * 3600_000);
}
export const careCopy: Record<CareAction, [string, string]> = {
  snack: [
    "A little snack. A very big opinion about it.",
    "Crumbs everywhere. Absolutely worth it.",
  ],
  clean: [
    "One bubble. Two bubbles. Where did the friend go?",
    "Fresh as a daisy. Slightly more bubbly.",
  ],
  play: [
    "Excellent ball. Questionable coordination.",
    "No winner. No score. Just a very good ball.",
  ],
};
export function drawCare(
  g: Graphics,
  action: CareAction | null,
  elapsed: number,
  x: number,
  y: number,
  s: number,
  sleeping: boolean,
  reduced: boolean,
): void {
  g.clear();
  const t = elapsed / 1000;
  if (sleeping) {
    for (let i = 0; i < 3; i++) {
      const phase = reduced ? i / 3 : (t * 0.25 + i / 3) % 1;
      const xx = x + (45 + phase * 25) * s,
        yy = y - (170 + phase * 80) * s,
        size = (5 + phase * 5) * s;
      g.moveTo(xx, yy)
        .lineTo(xx + size, yy)
        .lineTo(xx, yy + size)
        .lineTo(xx + size, yy + size)
        .stroke({ color: C.cream, width: 2 * s, alpha: 0.8 * (1 - phase) });
    }
  }
  if (action === "snack") {
    const bx = x + 38 * s,
      by = y - 4 * s;
    g.ellipse(bx, by + 9 * s, 29 * s, 6 * s).fill({
      color: C.petInk,
      alpha: 0.12,
    });
    g.moveTo(bx - 27 * s, by - 9 * s)
      .quadraticCurveTo(bx - 24 * s, by + 17 * s, bx, by + 14 * s)
      .quadraticCurveTo(bx + 24 * s, by + 17 * s, bx + 27 * s, by - 9 * s)
      .fill(C.clay);
    g.ellipse(bx, by - 9 * s, 27 * s, 9 * s).fill(C.clayLight);
    g.ellipse(bx, by - 10 * s, 22 * s, 6 * s).fill(C.woodDark);
    for (let i = 0; i < 5; i++)
      if (elapsed < 1300 + i * 270)
        g.circle(bx + (i - 2) * 7 * s, by - (11 + (i % 2) * 3) * s, 5 * s).fill(
          C.accentFood,
        );
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.9 + i / 3) % 1;
      g.circle(x + (14 + i * 9) * s, y - (80 - k * 60) * s, 2 * s).fill({
        color: C.accentFood,
        alpha: 1 - k,
      });
    }
  }
  if (action === "clean") {
    for (let i = 0; i < 15; i++) {
      const phase = reduced ? 0.5 : (t * 0.3 + i * 0.19) % 1;
      const xx =
        x + Math.sin(i * 9.7 + (reduced ? 0 : t)) * (50 + (i % 3) * 14) * s;
      const yy = y - (25 + phase * 205) * s;
      const r = (8 + (i % 4) * 4) * s;
      g.circle(xx, yy, r)
        .fill({ color: C.cream, alpha: 0.24 })
        .stroke({ color: C.cream, width: 1.4 * s, alpha: 0.8 });
      g.circle(xx - r * 0.3, yy - r * 0.35, r * 0.18).fill({
        color: C.cream,
        alpha: 0.8,
      });
    }
  }
  if (action === "play") {
    const bx = x + Math.cos(t * 4) * (reduced ? 24 : 74) * s;
    const hop = reduced ? 0 : Math.abs(Math.sin(t * 5)) * 45 * s;
    const by = y - 15 * s - hop;
    g.ellipse(bx, y + 3 * s, 19 * s, 5 * s).fill({
      color: C.petInk,
      alpha: 0.12,
    });
    g.circle(bx, by, 19 * s)
      .fill(C.accentToy)
      .stroke({ color: C.toyShade, width: 1.5 * s });
    g.moveTo(bx - 16 * s, by - 10 * s)
      .quadraticCurveTo(bx + 8 * s, by - 4 * s, bx + 8 * s, by + 17 * s)
      .stroke({ color: C.paper, width: 3 * s });
    g.moveTo(bx - 17 * s, by + 7 * s)
      .quadraticCurveTo(bx - 3 * s, by + 7 * s, bx + 14 * s, by - 12 * s)
      .stroke({ color: C.paper, width: 3 * s });
    g.circle(bx - 7 * s, by - 9 * s, 4 * s).fill({
      color: C.cream,
      alpha: 0.35,
    });
  }
}

/** Small, opt-in, locally synthesised sounds. No audio downloads or tracking. */
export class LittleSounds {
  private ctx: AudioContext | null = null;
  play(action: CareAction | "hello", enabled: boolean): void {
    if (!enabled) return;
    try {
      this.ctx ??= new AudioContext();
      const ctx = this.ctx;
      void ctx.resume().catch(() => {});
      const notes =
        action === "clean"
          ? [620, 830, 1040]
          : action === "play"
            ? [330, 494, 660]
            : [440, 554];
      notes.forEach((hz, i) => {
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain(),
          start = ctx.currentTime + i * 0.11;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(hz, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.24);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      });
    } catch {
      /* Sound is optional; the interaction always works. */
    }
  }
}
