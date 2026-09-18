interface Position {
  x: number;
  y: number;
}

/** The artwork's local down direction follows the head-to-body bone, even upside down.
 * Projecting onto screen Y flattens the texture whenever this bone turns sideways. */
export function petFrame(head: Position, body: Position) {
  const dx = body.x - head.x;
  const dy = body.y - head.y;
  const distance = Math.hypot(dx, dy);
  const downX = distance > 0.001 ? dx / distance : 0;
  const downY = distance > 0.001 ? dy / distance : 1;
  return {
    length: Math.max(60, Math.min(140, distance)),
    rotation: Math.atan2(-downX, downY),
    at(x: number, y: number): Position {
      return {
        x: head.x + downY * x + downX * y,
        y: head.y - downX * x + downY * y,
      };
    },
    offset(point: Position, x: number, y: number): Position {
      return {
        x: point.x + downY * x + downX * y,
        y: point.y - downX * x + downY * y,
      };
    },
  };
}

export function writeBodyVertices(
  vertices: { [index: number]: number },
  frame: ReturnType<typeof petFrame>,
) {
  for (let row = 0; row < 5; row++) {
    const y = -57 + ((frame.length + 97) * row) / 4;
    const left = frame.at(-85, y);
    const right = frame.at(85, y);
    vertices[row * 4] = left.x;
    vertices[row * 4 + 1] = left.y;
    vertices[row * 4 + 2] = right.x;
    vertices[row * 4 + 3] = right.y;
  }
}
