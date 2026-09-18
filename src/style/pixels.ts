// Original UI glyphs on a shared integer grid.
const glyphs: Record<string, string[]> = {
  t: ["0100", "0100", "1110", "0100", "0100", "0100", "0011"],
  a: ["0000", "0000", "0110", "0001", "0111", "1001", "0111"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  i: ["1", "0", "1", "1", "1", "1", "1"],
  F: ["1111", "1000", "1110", "1000", "1000"],
  O: ["0110", "1001", "1001", "1001", "0110"],
  D: ["1110", "1001", "1001", "1001", "1110"],
  W: ["10001", "10001", "10101", "10101", "01010"],
  A: ["0110", "1001", "1111", "1001", "1001"],
  S: ["0111", "1000", "0110", "0001", "1110"],
  H: ["1001", "1001", "1111", "1001", "1001"],
  P: ["1110", "1001", "1110", "1000", "1000"],
  L: ["1000", "1000", "1000", "1000", "1111"],
  Y: ["10001", "01010", "00100", "00100", "00100"],
};
export function pixelText(text: string): string {
  let x = 0,
    d = "";
  for (const letter of text) {
    const rows = glyphs[letter] ?? glyphs.O;
    rows.forEach((r, y) =>
      [...r].forEach((p, xx) => {
        if (p === "1") d += `M${x + xx} ${y}h1v1h-1z`;
      }),
    );
    x += rows[0].length + 1;
  }
  const height = Math.max(
    ...[...text].map((c) => (glyphs[c] ?? glyphs.O).length),
  );
  return `<svg aria-hidden="true" viewBox="0 0 ${x - 1} ${height}" fill="currentColor"><path d="${d}"/></svg>`;
}
export function pixelIcon(name: string): string {
  const r = (x: number, y: number, w: number, h: number, c: string) =>
    `<path fill="${c}" d="M${x} ${y}h${w}v${h}h-${w}z"/>`;
  let d = "";
  if (name === "food")
    d = `<path fill="#a82735" d="M4 8h5V6h4v2h6v2h2v9h-2v3H5v-2H3V10h1z"/><path fill="#ef4b4c" d="M5 9h13v2h2v7h-2v3H6v-2H4v-8h1z"/>${r(6, 10, 2, 6, "#ff9690")}${r(10, 3, 2, 5, "#6e4436")}<path fill="#88af50" d="M12 4h3V2h5v3h-3v2h-5z"/>`;
  else if (name === "wash")
    d = `<path fill="#b75a99" d="M2 12h19v8h-3v2H5v-2H2z"/><path fill="#ed90c8" d="M2 11h3V9h13v2h3v6h-3v2H5v-2H2z"/>${r(6, 11, 10, 2, "#ffd4ed")}${r(15, 2, 4, 4, "#c6edff")}${r(16, 1, 2, 6, "#effaff")}${r(20, 6, 3, 3, "#a8deff")}`;
  else if (name === "play")
    d = `<path fill="#bd851d" d="M7 2h10v2h4v4h2v9h-3v4h-4v2H7v-2H3v-4H1V8h2V4h4z"/><path fill="#f6c74a" d="M7 2h10v3h3v4h2v6h-3v4h-4v2H7v-2H3v-4H2V9h3V5h2z"/><path fill="#fff5c2" d="M6 3h2v4h3v3h4v3h4v2h3v2h-4v-2h-4v-3h-4V9H7V7H5V4h1z"/>${r(6, 5, 3, 2, "#fff5c2")}`;
  else if (name === "settings")
    d =
      '<path fill="currentColor" fill-rule="evenodd" d="M9 2h6v3h4v4h3v6h-3v4h-4v3H9v-3H5v-4H2V9h3V5h4zM9 8v1H8v6h1v1h6v-1h1V9h-1V8z"/>';
  else if (name === "close")
    d =
      '<path fill="currentColor" d="M4 4h3v3h3v3h4V7h3V4h3v3h-3v3h-3v4h3v3h3v3h-3v-3h-3v-3h-4v3H7v3H4v-3h3v-3h3v-4H7V7H4z"/>';
  else if (name === "sun")
    d = `${r(8, 8, 8, 8, "#ffce76")}${r(10, 1, 4, 4, "#ffce76")}${r(10, 19, 4, 4, "#ffce76")}${r(1, 10, 4, 4, "#ffce76")}${r(19, 10, 4, 4, "#ffce76")}${r(4, 4, 3, 3, "#ffce76")}${r(17, 17, 3, 3, "#ffce76")}${r(4, 17, 3, 3, "#ffce76")}${r(17, 4, 3, 3, "#ffce76")}`;
  else
    d =
      '<path fill="currentColor" d="M10 2h4v3h-3v9h3v3h7v3h-4v2H8v-2H4v-4H2V8h3V5h5z"/>';
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${d}</svg>`;
}
