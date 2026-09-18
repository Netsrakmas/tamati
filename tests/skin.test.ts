import { describe, expect, it } from "vitest";
import { petFrame, writeBodyVertices } from "../src/pet/skin";
import { Rig } from "../src/rig/verlet";
import { BABY } from "../src/rig/skeleton";
import { RIG } from "../src/style/motion";

function assertIntact(
  head: { x: number; y: number },
  body: { x: number; y: number },
) {
  const frame = petFrame(head, body);
  const vertices = new Float32Array(20);
  writeBodyVertices(vertices, frame);
  expect([...vertices].every(Number.isFinite)).toBe(true);
  // Every strip must have a substantial positive area: no folded, inverted or
  // vanished body, even when the head is below the belly during a pickup.
  for (let i = 0; i < 4; i++) {
    const p = i * 4;
    const ax = vertices[p + 2] - vertices[p];
    const ay = vertices[p + 3] - vertices[p + 1];
    const bx = vertices[p + 4] - vertices[p];
    const by = vertices[p + 5] - vertices[p + 1];
    expect(ax * by - ay * bx).toBeGreaterThan(6000);
  }
  // The face's full drawn extent must remain inside the textured body quad.
  const corners = [0, 2, 18, 16].map((i) => ({
    x: vertices[i],
    y: vertices[i + 1],
  }));
  for (const x of [-50, 50]) {
    for (const y of [-26, 53]) {
      const faceCorner = frame.at(x, y);
      corners.forEach((a, i) => {
        const b = corners[(i + 1) % corners.length];
        expect(
          (b.x - a.x) * (faceCorner.y - a.y) -
            (b.y - a.y) * (faceCorner.x - a.x),
        ).toBeGreaterThan(0);
      });
    }
  }
}

describe("pet artwork during pickup", () => {
  it("keeps its silhouette and attached face through a full rotation", () => {
    for (let degrees = 0; degrees < 360; degrees += 5) {
      const angle = (degrees * Math.PI) / 180;
      assertIntact(
        { x: 250, y: 300 },
        { x: 250 + Math.sin(angle) * 100, y: 300 + Math.cos(angle) * 100 },
      );
    }
  });

  it("survives the reported collapsed pose and a coincident bone", () => {
    assertIntact({ x: 200, y: 400 }, { x: 230, y: 303 });
    assertIntact({ x: 200, y: 400 }, { x: 200, y: 400 });
  });

  it.each(["head", "body", "armL", "armR", "legL", "legR", "ant1", "ant2"])(
    "stays intact while lifted, shaken and dropped by %s",
    (grabPoint) => {
      const rig = new Rig(
        BABY.points.map((p) => ({ ...p })),
        BABY.bones.map((b) => ({ ...b })),
        [],
        0,
      );
      rig.poseStrength = 0;
      rig.grabbed = rig.index(grabPoint);
      for (let tick = 0; tick < 240; tick++) {
        rig.grabX = Math.sin(tick * 0.17) * 140;
        rig.grabY = -240 - Math.sin(tick * 0.06) * 170;
        if (tick === 180) rig.grabbed = -1;
        rig.step(1 / RIG.fixedStepHz);
        assertIntact(rig.point("head"), rig.point("body"));
      }
    },
  );
});
