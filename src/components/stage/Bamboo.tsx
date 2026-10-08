import { BlurDef, Flicker, Floor, Fog, GlowDef, Noise, Shafts, Veil } from "./parts";
import { litFaces, rand, ridge } from "./util";

// Moonlit bamboo grove: a cold moon high on the right rims every stalk on its right
// edge, while two stone lanterns pool warm light on the mossy path.

const MOON = { x: 1210, y: 165 };

const FAR: [number, number][] = [
  [-20, 452], [120, 410], [260, 440], [400, 396], [540, 432], [700, 404], [860, 446], [1010, 400],
  [1160, 438], [1300, 392], [1450, 430], [1620, 404],
];
const MID: [number, number][] = [
  [-20, 500], [140, 462], [300, 494], [470, 470], [640, 506], [820, 478], [990, 508], [1150, 470],
  [1320, 500], [1480, 466], [1620, 492],
];

type Cane = { x: number; w: number; lean: number; nodes: number[]; leaves: number[] };

function grove(seed: number, n: number, x0: number, x1: number, w0: number, w1: number, gap?: [number, number]): Cane[] {
  const r = rand(seed);
  const out: Cane[] = [];
  while (out.length < n) {
    const x = x0 + r() * (x1 - x0);
    if (gap && x > gap[0] && x < gap[1]) continue;
    const w = w0 + r() * (w1 - w0);
    const nodes: number[] = [];
    for (let y = 560 - r() * 60; y > -40; y -= 70 + r() * 50) nodes.push(y);
    out.push({ x, w, lean: (r() - 0.5) * 50, nodes, leaves: nodes.filter(() => r() < 0.35) });
  }
  return out.sort((a, b) => a.w - b.w);
}

const FAR_CANES = grove(3, 46, -20, 1620, 4, 8);
const MID_CANES = grove(7, 20, -20, 1620, 10, 17, [560, 1040]);

const TOP = -40;
const BASE = 600;

function Stalk({ c, body, dark, rim, node, base = BASE, leaf }: { c: Cane; body: string; dark: string; rim: string; node: string; base?: number; leaf?: string }) {
  const at = (y: number) => c.x + (c.lean * (base - y)) / (base - TOP);
  const half = (y: number) => (c.w / 2) * (0.8 + (0.2 * (y - TOP)) / (base - TOP));
  const band = (f0: number, f1: number) =>
    [
      [at(base) - half(base) + 2 * half(base) * f0, base],
      [at(TOP) - half(TOP) + 2 * half(TOP) * f0, TOP],
      [at(TOP) - half(TOP) + 2 * half(TOP) * f1, TOP],
      [at(base) - half(base) + 2 * half(base) * f1, base],
    ]
      .map(([x, y]) => `${x.toFixed(1)},${y}`)
      .join(" ");
  return (
    <g>
      <polygon points={band(0, 1)} fill={body} />
      <polygon points={band(0, 0.4)} fill={dark} />
      <polygon points={band(0.83, 0.93)} fill={rim} opacity="0.7" />
      <path
        d={c.nodes.map((y) => `M${(at(y) - half(y) - 1).toFixed(1)} ${y.toFixed(1)} h${(half(y) * 2 + 2).toFixed(1)}`).join(" ")}
        stroke={node}
        strokeWidth={Math.max(1.5, c.w * 0.16)}
      />
      <path
        d={c.nodes.map((y) => `M${(at(y) - half(y) * 0.2).toFixed(1)} ${(y + c.w * 0.18).toFixed(1)} h${(half(y) * 1.1).toFixed(1)}`).join(" ")}
        stroke={rim}
        strokeWidth={Math.max(1, c.w * 0.07)}
        opacity="0.5"
      />
      {leaf &&
        c.leaves.map((y, i) => {
          const dir = i % 2 ? 1 : -1;
          return <Spray key={y} x={at(y)} y={y} dir={dir} size={c.w * 3.2} color={leaf} rim={rim} seed={Math.round(c.x + y)} />;
        })}
    </g>
  );
}

// A sprig of drooping lanceolate leaves; the upper edge of each catches the moon.
function Spray({ x, y, dir, size, color, rim, seed }: { x: number; y: number; dir: number; size: number; color: string; rim: string; seed: number }) {
  const r = rand(seed);
  const twig = `M${x.toFixed(1)} ${y.toFixed(1)} q${dir * size * 0.5} ${-size * 0.15} ${dir * size} ${size * 0.05}`;
  return (
    <g>
      <path d={twig} stroke={color} strokeWidth="1.6" fill="none" />
      {Array.from({ length: 5 }, (_, i) => {
        const len = size * (0.55 + r() * 0.35);
        const wide = len * 0.13;
        const ang = dir > 0 ? 15 + i * 16 + r() * 10 : 165 - i * 16 - r() * 10;
        const px = x + dir * size * (0.25 + i * 0.17);
        const py = y - size * 0.05 + i * size * 0.02;
        const d = `M0 0 C${len * 0.3} ${-wide} ${len * 0.7} ${-wide * 0.8} ${len} 0 C${len * 0.7} ${wide * 0.5} ${len * 0.3} ${wide * 0.6} 0 0 Z`;
        return (
          <g key={i} transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${ang.toFixed(0)})`}>
            <path d={d} fill={color} />
            <path d={`M${len * 0.1} ${-wide * 0.3} C${len * 0.4} ${-wide} ${len * 0.7} ${-wide * 0.7} ${len * 0.95} 0`} stroke={rim} strokeWidth="1" fill="none" opacity="0.5" />
          </g>
        );
      })}
    </g>
  );
}

export function Bamboo() {
  return (
    <g>
      <Sky />
      <Hills />
      <g opacity="0.55">
        {FAR_CANES.map((c, i) => (
          <Stalk key={i} c={c} body="#2b5c55" dark="#214a46" rim="#6fb5a2" node="#1a3c39" />
        ))}
      </g>
      <rect width="1600" height="600" fill="#0e2a2d" opacity="0.35" />
      <Veil id="b-mist1" y0={300} y1={610} color="#3f7f74" a={0.55} peak={0.8} />
      <Shafts
        id="b-beams"
        x={MOON.x}
        y={MOON.y}
        color="#d6f5e8"
        a={0.16}
        blur={14}
        rays={[[112, 2.2, 900], [124, 3.2, 1000], [137, 1.8, 1100], [149, 2.8, 1200], [160, 1.6, 1100]]}
      />
      {MID_CANES.map((c, i) => (
        <Stalk key={i} c={c} body="#2c6450" dark="#1d4739" rim="#a6e6c6" node="#123026" leaf="#2b6a4b" />
      ))}
      <Torii />
      <Veil id="b-mist2" y0={470} y1={620} color="#5c9c8a" a={0.45} peak={0.75} />
      <StoneLantern x={430} />
      <StoneLantern x={1170} />
      <Path />
      <Veil id="b-lane" y0={330} y1={800} color="#04110d" a={0.22} peak={0.6} />
    </g>
  );
}

function Sky() {
  const r = rand(17);
  const stars = Array.from({ length: 110 }, () => [r() * 1600, Math.pow(r(), 1.5) * 400, 0.5 + r() * 1.3, 0.25 + r() * 0.7]).filter(
    ([x, y]) => Math.hypot(x - MOON.x, y - MOON.y) > 150,
  );
  return (
    <>
      <defs>
        <linearGradient id="b-sky" x1="0" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#030912" />
          <stop offset="0.35" stopColor="#081a26" />
          <stop offset="0.72" stopColor="#103540" />
          <stop offset="1" stopColor="#1e534e" />
        </linearGradient>
        <GlowDef id="b-halo" color="#bfe9dc" a={0.45} />
        <radialGradient id="b-disc" cx="0.42" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#fffdf0" />
          <stop offset="0.7" stopColor="#f1ecca" />
          <stop offset="1" stopColor="#d9d3ab" />
        </radialGradient>
        <BlurDef id="b-wisp" sd="4" />
      </defs>
      <rect width="1600" height="600" fill="url(#b-sky)" />
      <g fill="#e6fff6">
        {stars.map(([x, y, s, a], i) => (
          <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={s.toFixed(2)} opacity={a.toFixed(2)} />
        ))}
      </g>
      <ellipse cx={MOON.x} cy={MOON.y} rx="460" ry="420" fill="url(#b-halo)" opacity="0.7" />
      <ellipse cx={MOON.x} cy={MOON.y} rx="150" ry="150" fill="url(#b-halo)" />
      <circle cx={MOON.x} cy={MOON.y} r="58" fill="url(#b-disc)" />
      <g fill="#c9c29b" opacity="0.45">
        <circle cx={MOON.x - 18} cy={MOON.y - 10} r="11" />
        <circle cx={MOON.x + 16} cy={MOON.y + 14} r="8" />
        <circle cx={MOON.x + 4} cy={MOON.y - 26} r="5" />
        <circle cx={MOON.x - 22} cy={MOON.y + 22} r="6" />
      </g>
      <g filter="url(#b-wisp)">
        <ellipse cx="1120" cy="200" rx="230" ry="9" fill="#9cc8bd" opacity="0.35" />
        <ellipse cx="1300" cy="232" rx="180" ry="7" fill="#7fb0a6" opacity="0.3" />
        <ellipse cx="420" cy="140" rx="300" ry="10" fill="#33626a" opacity="0.4" />
      </g>
    </>
  );
}

function Hills() {
  return (
    <>
      <defs>
        <linearGradient id="b-face" x1="0" y1="390" x2="0" y2="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9fd9c8" />
          <stop offset="1" stopColor="#9fd9c8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={ridge(FAR, 600)} fill="#1f4549" />
      <path d={litFaces(FAR, 600, MOON.x)} fill="url(#b-face)" opacity="0.18" />
      <Veil id="b-haze" y0={400} y1={600} color="#3c766e" a={0.6} peak={0.85} />
      <path d={ridge(MID, 600)} fill="#163536" />
      <path d={litFaces(MID, 600, MOON.x)} fill="url(#b-face)" opacity="0.12" />
    </>
  );
}

function Torii() {
  return (
    <g>
      <defs>
        <linearGradient id="b-torii" x1="0" y1="380" x2="0" y2="580" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6b2a2b" />
          <stop offset="1" stopColor="#3a1a1f" />
        </linearGradient>
      </defs>
      <g fill="url(#b-torii)">
        <path d="M682 418 L702 418 L706 576 L678 576 Z" />
        <path d="M898 418 L918 418 L922 576 L894 576 Z" />
        <rect x="660" y="430" width="280" height="13" />
        <rect x="794" y="408" width="12" height="24" />
        <path d="M628 392 Q800 404 972 392 L976 380 Q800 392 624 380 Z" />
      </g>
      <path d="M616 378 Q800 392 984 378 L980 372 Q800 384 620 372 Z" fill="#1b0c10" />
      <g fill="#c9f2de" opacity="0.3">
        <rect x="701" y="418" width="2.5" height="158" />
        <rect x="917" y="418" width="2.5" height="158" />
        <path d="M620 372 Q800 384 980 372 L981 375 Q800 387 619 375 Z" />
      </g>
      <rect x="674" y="566" width="36" height="12" fill="#2a2b28" />
      <rect x="890" y="566" width="36" height="12" fill="#2a2b28" />
    </g>
  );
}

function StoneLantern({ x }: { x: number }) {
  const stone = (
    <>
      <path d={`M${x - 26} 600 L${x + 26} 600 L${x + 18} 586 L${x - 18} 586 Z`} />
      <rect x={x - 9} y="540" width="18" height="46" />
      <path d={`M${x - 26} 540 L${x + 26} 540 L${x + 18} 530 L${x - 18} 530 Z`} />
      <rect x={x - 17} y="498" width="34" height="32" />
      <path d={`M${x - 40} 500 Q${x - 24} 496 ${x - 16} 482 L${x} 470 L${x + 16} 482 Q${x + 24} 496 ${x + 40} 500 Z`} />
      <circle cx={x} cy="465" r="6" />
    </>
  );
  return (
    <g>
      <ellipse cx={x} cy="512" rx="96" ry="96" fill="url(#b-lamp)" />
      <g fill="#4a5852">{stone}</g>
      <g fill="#14201c" opacity="0.55">
        <path d={`M${x - 26} 600 L${x - 8} 600 L${x - 6} 586 L${x - 18} 586 Z`} />
        <rect x={x - 9} y="540" width="7" height="46" />
        <rect x={x - 17} y="498" width="10" height="32" />
      </g>
      <Noise id={`b-lantern-${x}`} freq="0.22" seed={x} color="#1a2622" gain={4} bias={-2.1} opacity={0.7}>
        {stone}
      </Noise>
      <rect x={x - 9} y="504" width="18" height="18" fill="#ffd885" />
      <rect x={x - 1.5} y="504" width="3" height="18" fill="#6a4a22" />
      <g fill="#cdeee0" opacity="0.5">
        <rect x={x + 7} y="540" width="2" height="46" />
        <rect x={x + 15} y="498" width="2" height="32" />
        <path d={`M${x} 470 L${x + 16} 482 Q${x + 24} 496 ${x + 40} 500 L${x + 35} 500 Q${x + 21} 495 ${x + 13} 483 Z`} />
      </g>
      <g fill="#ffcf80" opacity="0.35">
        <rect x={x - 17} y="526" width="34" height="3" />
        <rect x={x - 26} y="538" width="52" height="2" />
      </g>
    </g>
  );
}

function Path() {
  const r = rand(41);
  const tufts = Array.from({ length: 90 }, () => {
    const x = r() * 1600;
    const edge = x < 360 || x > 1240;
    const y = edge && r() < 0.6 ? 590 + r() * 200 : 576 + r() * 14;
    return { x, y, s: (y - 470) / 110 };
  });
  return (
    <Floor id="b" far="#4b6b5d" near="#111d18" joint="#0a1410" edge="#c3ead6" tile={0.5} stagger seed={12} mottle={0.6} freq="0.006 0.02">
      <defs>
        <GlowDef id="b-lamp" color="#ffc56a" a={0.55} />
        <GlowDef id="b-pool" color="#ffb85c" a={0.4} />
      </defs>
      <Noise id="b-moss" freq="0.012 0.04" octaves={4} seed={5} color="#3f7d4c" gain={3.2} bias={-1.8} opacity={0.55}>
        <rect y="580" width="1600" height="320" />
      </Noise>
      <ellipse cx="430" cy="610" rx="190" ry="34" fill="url(#b-pool)" />
      <ellipse cx="1170" cy="610" rx="190" ry="34" fill="url(#b-pool)" />
      <path d="M720 580 L880 580 L1130 900 L470 900 Z" fill="#cdeedd" opacity="0.05" />
      <g stroke="#1c3a2a" strokeWidth="1.6" fill="none" strokeLinecap="round">
        {tufts.map(({ x, y, s }, i) => (
          <path
            key={i}
            d={`M${x.toFixed(1)} ${y.toFixed(1)} q${-3 * s} ${-6 * s} ${-5 * s} ${-12 * s} M${x.toFixed(1)} ${y.toFixed(1)} q${s} ${-8 * s} ${2 * s} ${-15 * s} M${x.toFixed(1)} ${y.toFixed(1)} q${4 * s} ${-5 * s} ${7 * s} ${-10 * s}`}
            strokeWidth={Math.max(1, s * 0.9)}
            stroke={i % 3 ? "#1c3a2a" : "#3e6e52"}
          />
        ))}
      </g>
    </Floor>
  );
}

// Near layer: thick foreground canes that frame the shot and bend in the wind.
export function BambooNear({ side }: { side: -1 | 1 }) {
  const canes = grove(side < 0 ? 21 : 23, 4, side < 0 ? -30 : 1380, side < 0 ? 220 : 1630, 26, 42).map((c) => ({ ...c, lean: c.lean * 0.4 }));
  return (
    <g>
      {canes.map((c, i) => (
        <Stalk key={i} c={c} body="#0f2a1f" dark="#081810" rim="#6fbf95" node="#04100a" base={920} leaf="#0f2c1f" />
      ))}
    </g>
  );
}

export function BambooFx() {
  return (
    <>
      <Fog x={500} y={590} w={1300} h={110} color="rgb(150 210 190 / 0.2)" dur={54} />
      <Fog x={1150} y={560} w={1000} h={80} color="rgb(170 220 205 / 0.16)" dur={70} delay={-30} />
      <Flicker x={430} y={512} r={80} color="rgb(255 200 110 / 0.45)" />
      <Flicker x={1170} y={512} r={80} color="rgb(255 200 110 / 0.45)" delay={-1.4} />
    </>
  );
}
