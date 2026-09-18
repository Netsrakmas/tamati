import {
  Assets,
  Container,
  Graphics,
  MeshPlane,
  Sprite,
  Texture,
} from "pixi.js";
import type { Rig } from "../rig/verlet";
import type { Face } from "./behaviours";
import bodyURL from "../assets/pet-body.png";
import armURL from "../assets/pet-arm.png";
import footURL from "../assets/pet-foot.png";
import tipURL from "../assets/pet-tip.png";

/** Authored pixel parts driven by the existing continuous physics simulation.
 * The entire scene is rasterized to one low-resolution pixel grid in main.ts. */
export class PixelPet extends Container {
  private body: MeshPlane;
  private armL: Sprite;
  private armR: Sprite;
  private footL: Sprite;
  private footR: Sprite;
  private tip: Sprite;
  private stalk = new Graphics();
  private expression = new Graphics();
  private constructor(textures: Texture[]) {
    super();
    for (const t of textures) t.source.scaleMode = "nearest";
    this.body = new MeshPlane({
      texture: textures[0],
      verticesX: 2,
      verticesY: 5,
    });
    this.body.autoResize = false;
    this.armL = new Sprite(textures[1]);
    this.armR = new Sprite(textures[1]);
    this.footL = new Sprite(textures[2]);
    this.footR = new Sprite(textures[2]);
    this.tip = new Sprite(textures[3]);
    for (const arm of [this.armL, this.armR]) arm.anchor.set(0.5, 0.15);
    for (const foot of [this.footL, this.footR]) {
      foot.anchor.set(0.5);
      foot.width = 42;
      foot.height = 23;
    }
    this.tip.anchor.set(0.5);
    this.tip.width = 25;
    this.tip.height = 25;
    this.addChild(
      this.stalk,
      this.tip,
      this.footL,
      this.footR,
      this.body,
      this.armL,
      this.armR,
      this.expression,
    );
  }
  static async load() {
    return new PixelPet(
      await Promise.all(
        [bodyURL, armURL, footURL, tipURL].map((url) =>
          Assets.load<Texture>(url),
        ),
      ),
    );
  }
  draw(rig: Rig, face: Face) {
    const point = (name: string) => {
      const p = rig.point(name);
      return { x: p.x - rig.rootX, y: p.y - rig.rootY };
    };
    const head = point("head"),
      body = point("body"),
      a1 = point("ant1"),
      a2 = point("ant2");
    const tilt = Math.atan2(head.x - body.x, -(head.y - body.y));
    const buffer = this.body.geometry.getAttribute("aPosition").buffer;
    for (let row = 0; row < 5; row++) {
      const t = row / 4;
      // Face stays attached to the head; the broad lower body follows the heavier body mass.
      const k = Math.min(1, Math.max(0, (t - 0.22) / 0.55));
      const x = head.x + (body.x - head.x) * k;
      const y = (head.y - 57) * (1 - t) + (body.y + 40) * t;
      const width = 170;
      buffer.data[row * 4] = x - width / 2;
      buffer.data[row * 4 + 1] = y;
      buffer.data[row * 4 + 2] = x + width / 2;
      buffer.data[row * 4 + 3] = y;
    }
    buffer.update();
    for (const [sprite, name, sign] of [
      [this.armL, "armL", -1],
      [this.armR, "armR", 1],
    ] as const) {
      const hand = point(name);
      const sx = body.x + sign * 56,
        sy = head.y * 0.35 + body.y * 0.65;
      const hx = hand.x + sign * 26,
        hy = hand.y - 2;
      sprite.position.set(sx, sy);
      sprite.width = 31;
      sprite.height = Math.max(40, Math.hypot(hx - sx, hy - sy) + 20);
      sprite.rotation = Math.atan2(-(hx - sx), hy - sy);
    }
    for (const [sprite, name] of [
      [this.footL, "legL"],
      [this.footR, "legR"],
    ] as const) {
      const p = point(name);
      sprite.position.set(p.x * 1.15, p.y + 9);
    }
    const tipX = a2.x + 13,
      tipY = a2.y + 6;
    this.stalk.clear();
    this.stalk
      .moveTo(head.x, head.y - 50)
      .quadraticCurveTo(a1.x - 8, a1.y - 21, tipX, tipY)
      .stroke({ color: 0xb65524, width: 13, cap: "round" });
    this.stalk
      .moveTo(head.x - 2, head.y - 51)
      .quadraticCurveTo(a1.x - 10, a1.y - 22, tipX - 2, tipY - 2)
      .stroke({ color: 0xff9e3e, width: 8, cap: "round" });
    this.tip.position.set(tipX, tipY);
    this.expression.position.set(head.x, head.y + 9);
    this.expression.rotation = tilt * 0.65;
    drawFace(this.expression, face);
  }
}
function drawFace(g: Graphics, face: Face) {
  g.clear();
  const ink = 0x3b261d,
    white = 0xffefd0;
  const ecstatic = face === "joy" || face === "delighted";
  const happy = face === "happy" || ecstatic;
  const closed = face === "blink" || face === "asleep";
  for (const side of [-1, 1]) {
    const x = side * 24;
    g.ellipse(side * 40, 23, 10, 6).fill(0xec793e);
    if (closed) {
      g.moveTo(x - 12, 5)
        .quadraticCurveTo(x, 13, x + 12, 5)
        .stroke({ color: ink, width: 4 });
    } else if (ecstatic) {
      g.moveTo(x - 12, 8)
        .quadraticCurveTo(x, -10, x + 12, 8)
        .stroke({ color: ink, width: 5 });
    } else {
      const squint = face === "annoyed";
      const ey = squint ? 7 : 0;
      g.ellipse(x, ey, 14, squint ? 10 : 20).fill(ink);
      g.ellipse(x, ey - 1, 12, squint ? 8 : 18).fill(white);
      g.ellipse(x + 2, ey + 3, 8.5, squint ? 7 : 14).fill(ink);
      g.rect(x - 1, ey - 7, 5, 6).fill(0xffffff);
      g.rect(x + 5, ey + 7, 3, 3).fill(0xbf874b);
      if (squint) g.rect(x - 14, -4, 28, 6).fill(0xf79a3e);
    }
    if (!closed) {
      const y = face === "surprised" ? -32 : happy ? -30 : -27;
      g.moveTo(x - 10, y + side * 2)
        .lineTo(x, y - 3)
        .lineTo(x + 9, y)
        .stroke({ color: 0x753c21, width: 4 });
    }
  }
  if (ecstatic) {
    g.ellipse(0, 30, 15, 12).fill(ink);
    g.ellipse(2, 37, 9, 5).fill(0xf18b70);
    g.rect(-8, 21, 16, 4).fill(white);
  } else if (face === "surprised") {
    g.ellipse(0, 30, 7, 10).fill(ink);
  } else if (face === "asleep") {
    g.ellipse(0, 31, 5, 4).fill(ink);
  } else if (face === "annoyed") {
    g.moveTo(-10, 31).lineTo(11, 29).stroke({ color: ink, width: 3 });
  } else {
    g.moveTo(-14, 26)
      .quadraticCurveTo(0, happy ? 45 : 38, 15, 24)
      .stroke({ color: ink, width: 3 });
    if (happy) g.ellipse(9, 34, 5, 6).fill(0xf18b70);
  }
}
