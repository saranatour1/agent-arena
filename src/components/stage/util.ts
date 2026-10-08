// Shared math for the stage art. Scatter is seeded, so every load paints the same scene.

export const HORIZON = 580;

// Eye level for the floor's perspective; the floor's far edge sits at HORIZON.
const EYE = 470;
const DEPTH = 900 - EYE;

export function rand(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// "#rrggbb" → "r g b" in 0..1, for feColorMatrix rows.
export function rgb(hex: string) {
  return [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3));
}

// Ground plane: world x (0 = centre) and depth z (1 = bottom edge of the screen) → screen point.
export const ground = (x: number, z: number): [number, number] => [800 + (x * DEPTH) / z, EYE + DEPTH / z];
export const depthAt = (y: number) => DEPTH / (y - EYE);

// A ridge line closed down to `base`.
export const ridge = (p: [number, number][], base: number) =>
  `M${p[0][0]} ${base} ${p.map(([x, y]) => `L${x} ${y}`).join(" ")} L${p[p.length - 1][0]} ${base} Z`;

// The slope of every peak that faces a light at `lightX`, for rim-lit mountain faces.
export function litFaces(p: [number, number][], base: number, lightX: number) {
  const out: string[] = [];
  for (let i = 1; i < p.length - 1; i++) {
    const [x, y] = p[i];
    if (y > p[i - 1][1] || y > p[i + 1][1]) continue;
    const [nx, ny] = p[x < lightX ? i + 1 : i - 1];
    const foot = Math.min(base, y + (base - y) * 0.75);
    out.push(`M${x} ${y} L${nx} ${ny} L${x + (nx - x) * 0.3} ${foot} Z`);
  }
  return out.join(" ");
}

// Soft cloud bank: a flat streak with puffs along its back.
export function cloud(cx: number, cy: number, len: number, seed: number): [number, number, number, number][] {
  const r = rand(seed);
  const out: [number, number, number, number][] = [[cx, cy, len / 2, 5 + r() * 4]];
  const n = 6 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const t = (r() - 0.5) * 0.85;
    const rx = len * (0.07 + r() * 0.13);
    out.push([cx + t * len, cy - 3 - r() * 9 * (1 - Math.abs(t)), rx, rx * (0.22 + r() * 0.14)]);
  }
  return out;
}
