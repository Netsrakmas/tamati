import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { Ground, WorldPos } from "../world/ground";
import { worldToScreen } from "../world/ground";
import wideURL from "../assets/room-wide.png";
import tallURL from "../assets/room-tall.png";
import wideNightURL from "../assets/room-wide-night.png";
import tallNightURL from "../assets/room-tall-night.png";
export type TimeOfDay = "day" | "dusk" | "night";
export function timeOfDay(date: Date): TimeOfDay {
  const h = date.getHours();
  return h >= 21 || h < 7 ? "night" : h >= 17 ? "dusk" : "day";
}
export function roomColours(tod: TimeOfDay) {
  return {
    sky: tod === "night" ? 0x1a3056 : 0x365e97,
    ground: tod === "night" ? 0x2c4169 : 0x708bad,
  };
}
export class PixelRoom extends Container {
  private background = new Sprite();
  private sunset = new Graphics();
  private constructor(private textures: Texture[]) {
    super();
    for (const texture of textures) texture.source.scaleMode = "nearest";
    this.addChild(this.background, this.sunset);
  }
  static async load() {
    return new PixelRoom(
      await Promise.all(
        [wideURL, tallURL, wideNightURL, tallNightURL].map((url) =>
          Assets.load<Texture>(url),
        ),
      ),
    );
  }
  layout(g: Ground, tod: TimeOfDay) {
    const wide = g.screenW / g.screenH >= 1.05;
    const texture = this.textures[(tod === "night" ? 2 : 0) + (wide ? 0 : 1)];
    this.background.texture = texture;
    // The two authored compositions keep furniture readable without stretching it.
    const scale = Math.max(
      g.screenW / texture.width,
      g.screenH / texture.height,
    );
    this.background.scale.set(scale);
    this.background.position.set(
      (g.screenW - texture.width * scale) / 2,
      (g.screenH - texture.height * scale) / 2,
    );
    this.sunset.clear();
    if (tod === "dusk")
      this.sunset
        .rect(0, 0, g.screenW, g.screenH)
        .fill({ color: 0xe89468, alpha: 0.17 });
  }
}
export function drawShadow(
  g: Graphics,
  ground: Ground,
  at: WorldPos,
  lift: number,
): void {
  const p = worldToScreen(ground, at),
    shrink = Math.max(0.45, 1 - Math.max(0, lift) / 220);
  g.clear()
    .ellipse(p.x, p.y + 2, 68 * p.scale * shrink, 13 * p.scale * shrink)
    .fill({ color: 0x17294a, alpha: 0.22 * shrink });
  g.ellipse(p.x, p.y, 38 * p.scale * shrink, 6 * p.scale * shrink).fill({
    color: 0x152441,
    alpha: 0.2 * shrink,
  });
}
