import { BlurDef, Flicker, Floor, Fog, GlowDef, Noise, Shafts, Veil } from "./parts";
import { cloud, depthAt, litFaces, rand, ridge } from "./util";

// Sakura Temple at dusk: the sun sits low behind the pagoda's right shoulder, so
// everything facing us is in warm shadow with hot rim light on its right edges.

const SUN = { x: 1110, y: 356 };

const CLOUDS = [
  [290, 150, 560, 3],
  [760, 200, 640, 5],
  [1390, 232, 440, 8],
  [540, 312, 420, 11],
  [1460, 112, 380, 13],
  [120, 258, 320, 17],
  [1090, 384, 380, 19],
  [880, 120, 300, 23],
].map(([x, y, len, seed]) => ({ x, y, puffs: cloud(x, y, len, seed) }));

const FAR: [number, number][] = [
  [-20, 470], [90, 432], [200, 452], [330, 400], [450, 446], [560, 422], [680, 458], [820, 432],
  [950, 462], [1080, 414], [1210, 448], [1330, 406], [1460, 440], [1620, 420],
];
const MID: [number, number][] = [
  [-20, 520], [110, 472], [240, 505], [380, 460], [520, 512], [660, 488], [800, 520], [940, 482],
  [1090, 515], [1240, 464], [1380, 500], [1500, 474], [1620, 500],
];

export function Temple() {
  return (
    <g>
      <Sky />
      <Hills />
      <Balustrade />
      <Pagoda />
      <StoneLantern x={492} />
      <StoneLantern x={1108} />
      <Courtyard />
      <CherryTree side={-1} />
      <CherryTree side={1} />
      <Veil id="t-lane" y0={330} y1={800} color="#160a1a" a={0.2} peak={0.62} />
    </g>
  );
}

function Sky() {
  return (
    <>
      <defs>
        <linearGradient id="t-sky" x1="0" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#120c28" />
          <stop offset="0.3" stopColor="#331a4c" />
          <stop offset="0.55" stopColor="#7a2f60" />
          <stop offset="0.75" stopColor="#c8566a" />
          <stop offset="0.9" stopColor="#ee8d68" />
          <stop offset="1" stopColor="#f9b27c" />
        </linearGradient>
        <GlowDef id="t-sunglow" color="#ffb47a" a={0.75} />
        <GlowDef id="t-suncore" color="#fff1c8" />
        <radialGradient id="t-cloud" cx={SUN.x} cy={SUN.y} r="1100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c76272" />
          <stop offset="0.35" stopColor="#7c3762" />
          <stop offset="1" stopColor="#2e1840" />
        </radialGradient>
        <radialGradient id="t-cloudrim" cx={SUN.x} cy={SUN.y} r="1100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe2b4" />
          <stop offset="0.4" stopColor="#f59a82" />
          <stop offset="1" stopColor="#8a3c66" />
        </radialGradient>
        <BlurDef id="t-soft" sd="2.2" />
        <BlurDef id="t-cloudblur" sd="3.2" />
      </defs>
      <rect width="1600" height="600" fill="url(#t-sky)" />
      <ellipse cx="960" cy="540" rx="1150" ry="200" fill="url(#t-sunglow)" opacity="0.75" />
      <ellipse cx={SUN.x} cy={SUN.y} rx="620" ry="430" fill="url(#t-sunglow)" />
      <ellipse cx={SUN.x} cy={SUN.y} rx="170" ry="170" fill="url(#t-suncore)" opacity="0.85" />
      <circle cx={SUN.x} cy={SUN.y} r="42" fill="#fff4d6" />
      <Shafts
        id="t-rays"
        x={SUN.x}
        y={SUN.y}
        color="#ffd9ad"
        a={0.2}
        blur={16}
        rays={[[152, 2.4, 900], [166, 3.4, 1150], [180, 2.4, 1200], [193, 4, 1000], [345, 3, 600], [12, 3.2, 520]]}
      />
      <g filter="url(#t-cloudblur)">
        {CLOUDS.map(({ x, y, puffs }, i) => {
          const d = Math.hypot(SUN.x - x, SUN.y - y) || 1;
          const [ox, oy] = [((SUN.x - x) / d) * 4, Math.max(3, ((SUN.y - y) / d) * 6)];
          return (
            <g key={i} opacity={y < 180 ? 0.8 : 1}>
              {puffs.map(([cx, cy, rx, ry], k) => (
                <ellipse key={k} cx={cx + ox} cy={cy + oy} rx={rx} ry={ry} fill="url(#t-cloudrim)" />
              ))}
              {puffs.map(([cx, cy, rx, ry], k) => (
                <ellipse key={k} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#t-cloud)" />
              ))}
            </g>
          );
        })}
      </g>
      <g fill="none" stroke="#2a1534" strokeWidth="2.4" strokeLinecap="round">
        {[
          [430, 228, 1], [462, 214, 0.8], [488, 236, 0.9], [520, 206, 0.7], [548, 226, 0.6], [404, 250, 0.7],
        ].map(([x, y, s]) => (
          <path key={x} d={`M${x} ${y} q${6 * s} ${-6 * s} ${12 * s} 0 q${6 * s} ${-6 * s} ${12 * s} 0`} />
        ))}
      </g>
    </>
  );
}

function Hills() {
  return (
    <>
      <defs>
        <linearGradient id="t-far" x1="0" y1="400" x2="0" y2="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8e4271" />
          <stop offset="1" stopColor="#d27577" />
        </linearGradient>
        <linearGradient id="t-mid" x1="0" y1="460" x2="0" y2="590" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#552550" />
          <stop offset="1" stopColor="#8d4166" />
        </linearGradient>
        <linearGradient id="t-face" x1="0" y1="400" x2="0" y2="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffc09a" />
          <stop offset="1" stopColor="#ffc09a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={ridge(FAR, 600)} fill="url(#t-far)" />
      <path d={litFaces(FAR, 600, SUN.x)} fill="url(#t-face)" opacity="0.4" filter="url(#t-soft)" />
      <Veil id="t-mist1" y0={420} y1={560} color="#e99a92" a={0.55} peak={0.7} />
      <path d={ridge(MID, 600)} fill="url(#t-mid)" />
      <path d={litFaces(MID, 600, SUN.x)} fill="url(#t-face)" opacity="0.28" filter="url(#t-soft)" />
      <Veil id="t-mist2" y0={480} y1={590} color="#d98390" a={0.5} peak={0.75} />
    </>
  );
}

function Balustrade() {
  const posts = Array.from({ length: 19 }, (_, i) => i * 90 - 10).filter((x) => x < 540 || x > 1050);
  const rail = (x0: number, x1: number) => (
    <g key={x0}>
      <rect x={x0} y="534" width={x1 - x0} height="46" fill="#2c1828" />
      <rect x={x0} y="540" width={x1 - x0} height="30" fill="#1d0f1b" />
      <rect x={x0} y="526" width={x1 - x0} height="12" rx="3" fill="#3d2433" />
      <rect x={x0} y="526" width={x1 - x0} height="2.5" fill="#f6b195" opacity="0.55" />
      <rect x={x0} y="570" width={x1 - x0} height="10" fill="#33202d" />
    </g>
  );
  return (
    <g>
      {rail(-10, 566)}
      {rail(1034, 1610)}
      {posts.map((x) => (
        <g key={x}>
          <rect x={x} y="520" width="16" height="60" fill="#3a2231" />
          <rect x={x + 13} y="520" width="3" height="60" fill="#ffae8a" opacity="0.35" />
          <rect x={x - 2} y="516" width="20" height="7" rx="2" fill="#4a2c3b" />
        </g>
      ))}
    </g>
  );
}

function roof(cx: number, y: number, hw: number, fw: number, top: number, lift: number) {
  const l = cx - hw;
  const r = cx + hw;
  const k = (hw - fw) * 0.22;
  const sag = y - lift * 0.55;
  const eave = `M${l} ${y - lift} Q${cx - hw * 0.74} ${y + 5} ${cx - hw * 0.46} ${y + 5} L${cx + hw * 0.46} ${y + 5} Q${cx + hw * 0.74} ${y + 5} ${r} ${y - lift}`;
  const up = `Q${cx + fw + k} ${sag} ${cx + fw} ${top} L${cx - fw} ${top} Q${cx - fw - k} ${sag} ${l} ${y - lift}`;
  const rim = `M${l} ${y - lift} Q${cx - fw - k} ${sag} ${cx - fw} ${top} L${cx + fw} ${top} Q${cx + fw + k} ${sag} ${r} ${y - lift}`;
  return { body: `${eave} ${up} Z`, eave, rim, l, r };
}

const ROOFS = [
  roof(800, 440, 302, 190, 392, 30),
  roof(800, 352, 226, 128, 312, 24),
  roof(800, 274, 166, 16, 226, 22),
];

function Pagoda() {
  return (
    <g>
      <defs>
        <linearGradient id="t-rim" x1="560" y1="0" x2="1100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff9f86" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#ffc59a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff0c8" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="t-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd28a" />
          <stop offset="1" stopColor="#d9703f" />
        </linearGradient>
        <linearGradient id="t-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2240" />
          <stop offset="1" stopColor="#1f1024" />
        </linearGradient>
        <GlowDef id="t-lamp" color="#ffa64d" a={0.6} />
        {ROOFS.map((f, i) => (
          <clipPath key={i} id={`t-roofclip-${i}`}>
            <path d={f.body} />
          </clipPath>
        ))}
      </defs>
      {/* podium + stairs */}
      <rect x="566" y="512" width="468" height="70" fill="#2b1826" />
      <rect x="560" y="508" width="480" height="8" fill="#3e2535" />
      <rect x="560" y="508" width="480" height="2" fill="#f2ad90" opacity="0.4" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <rect x={740 - i * 4} y={514 + i * 9.5} width={120 + i * 8} height="9.5" fill={i % 2 ? "#3b2433" : "#432939"} />
          <rect x={740 - i * 4} y={514 + i * 9.5} width={120 + i * 8} height="1.5" fill="#d99a86" opacity="0.35" />
        </g>
      ))}
      {/* ground floor */}
      <rect x="600" y="432" width="400" height="80" fill="#24121f" />
      {[616, 696, 848, 928].map((x) => (
        <g key={x}>
          <rect x={x + 6} y="452" width="56" height="44" fill="url(#t-window)" opacity="0.8" />
          <path
            d={`${[14, 28, 42].map((d) => `M${x + 6 + d} 452 V496`).join(" ")} ${[463, 474, 485].map((y) => `M${x + 6} ${y} H${x + 62}`).join(" ")}`}
            stroke="#2a121c"
            strokeWidth="2.2"
          />
          <rect x={x + 6} y="452" width="56" height="44" fill="none" stroke="#1a0b14" strokeWidth="3" />
        </g>
      ))}
      <rect x="776" y="452" width="48" height="60" fill="url(#t-window)" />
      <rect x="798" y="452" width="4" height="60" fill="#5a2a26" />
      <rect x="776" y="452" width="48" height="60" fill="none" stroke="#1a0b14" strokeWidth="3" />
      {[604, 684, 764, 836, 916, 996].map((x) => (
        <rect key={x} x={x - 6} y="436" width="12" height="76" fill="#6a1f2c" />
      ))}
      <rect x="600" y="432" width="400" height="16" fill="#000" opacity="0.4" />
      <rect x="997" y="436" width="3" height="76" fill="#ffb98f" opacity="0.5" />
      {/* door light spilling down the stairs */}
      <path d="M776 512 L824 512 L878 582 L722 582 Z" fill="#ffb35c" opacity="0.14" />
      {/* upper floors */}
      <rect x="655" y="348" width="290" height="50" fill="#22101d" />
      {[680, 740, 800, 860, 920].map((x) => (
        <rect key={x} x={x - 16} y="356" width="32" height="26" fill="url(#t-window)" opacity="0.5" />
      ))}
      {[660, 720, 780, 820, 880, 940].map((x) => (
        <rect key={x} x={x - 4} y="350" width="8" height="48" fill="#5c1c29" />
      ))}
      <rect x="638" y="384" width="324" height="5" fill="#3d2232" />
      <path d={Array.from({ length: 21 }, (_, i) => `M${642 + i * 16} 389 V398`).join(" ")} stroke="#3d2232" strokeWidth="3" />
      <rect x="712" y="270" width="176" height="50" fill="#1f0e1b" />
      {[740, 800, 860].map((x) => (
        <rect key={x} x={x - 12} y="282" width="24" height="22" fill="url(#t-window)" opacity="0.4" />
      ))}
      {ROOFS.map((f, i) => (
        <g key={i}>
          <rect x={f.l + 40} y={i === 0 ? 432 : i === 1 ? 346 : 268} width={f.r - f.l - 80} height="10" fill="#000" opacity="0.35" />
          <path d={f.body} fill="url(#t-roof)" />
          <g clipPath={`url(#t-roofclip-${i})`} stroke="#4a2c4a" strokeWidth="2.2" opacity="0.7">
            {Array.from({ length: Math.floor((f.r - f.l) / 10) }, (_, k) => {
              const x = f.l + 5 + k * 10;
              return <line key={k} x1={800 + (x - 800) * 0.72} y1="200" x2={x} y2="460" />;
            })}
          </g>
          <path d={f.eave} fill="none" stroke="#120812" strokeWidth="6" />
          <path d={f.eave} fill="none" stroke="#e08a72" strokeWidth="1.2" opacity="0.25" transform="translate(0 3)" />
          <path d={f.rim} fill="none" stroke="url(#t-rim)" strokeWidth="2.6" strokeLinecap="round" />
          {[f.l, f.r].map((x) => (
            <circle key={x} cx={x} cy={(i === 0 ? 440 : i === 1 ? 352 : 274) - (i === 0 ? 30 : i === 1 ? 24 : 22) - 2} r="4" fill="#d4a04a" />
          ))}
        </g>
      ))}
      {/* spire */}
      <rect x="796" y="150" width="8" height="82" fill="#2a1626" />
      <rect x="802" y="150" width="2" height="82" fill="#ffd9a8" opacity="0.7" />
      {Array.from({ length: 7 }, (_, i) => (
        <ellipse key={i} cx="800" cy={170 + i * 8.5} rx="10" ry="2.6" fill="#3a2232" stroke="#ffc995" strokeOpacity="0.45" strokeWidth="1" />
      ))}
      <circle cx="800" cy="146" r="7" fill="#d8a44c" />
      <circle cx="802" cy="144" r="2.5" fill="#fff0c0" />
      {/* hanging paper lanterns */}
      {[622, 978].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="476" rx="80" ry="80" fill="url(#t-lamp)" />
          <line x1={x} y1="444" x2={x} y2="458" stroke="#120812" strokeWidth="2" />
          <ellipse cx={x} cy="476" rx="14" ry="18" fill="#f4703c" />
          <ellipse cx={x} cy="474" rx="9" ry="13" fill="#ffd27a" />
          <path d={`M${x - 13} 470 H${x + 13} M${x - 14} 476 H${x + 14} M${x - 13} 482 H${x + 13}`} stroke="#b8402a" strokeWidth="1" opacity="0.7" />
          <rect x={x - 7} y="456" width="14" height="4" fill="#1c0c12" />
          <rect x={x - 7} y="492" width="14" height="4" fill="#1c0c12" />
          <line x1={x} y1="496" x2={x} y2="508" stroke="#c8402a" strokeWidth="2" />
        </g>
      ))}
    </g>
  );
}

function StoneLantern({ x }: { x: number }) {
  return (
    <g>
      <ellipse cx={x} cy="532" rx="70" ry="70" fill="url(#t-lamp)" opacity="0.8" />
      <ellipse cx={x} cy="604" rx="70" ry="12" fill="#ffa64d" opacity="0.18" />
      <g fill="#3d2733">
        <path d={`M${x - 22} 604 L${x + 22} 604 L${x + 16} 592 L${x - 16} 592 Z`} />
        <rect x={x - 7} y="552" width="14" height="40" />
        <path d={`M${x - 20} 552 L${x + 20} 552 L${x + 15} 544 L${x - 15} 544 Z`} />
        <rect x={x - 13} y="520" width="26" height="24" />
        <path d={`M${x - 30} 522 Q${x - 18} 518 ${x - 12} 508 L${x} 500 L${x + 12} 508 Q${x + 18} 518 ${x + 30} 522 Z`} />
        <circle cx={x} cy="496" r="5" />
      </g>
      <rect x={x - 7} y="525" width="14" height="14" fill="#ffd27a" />
      <rect x={x - 2} y="525" width="2" height="14" fill="#5a2a20" />
      <g fill="#ffb48e" opacity="0.4">
        <rect x={x + 5} y="552" width="2" height="40" />
        <rect x={x + 11} y="520" width="2" height="24" />
        <path d={`M${x} 500 L${x + 12} 508 Q${x + 18} 518 ${x + 30} 522 L${x + 26} 522 Q${x + 15} 517 ${x + 10} 509 Z`} />
      </g>
    </g>
  );
}

function Courtyard() {
  const r = rand(29);
  const petals = Array.from({ length: 80 }, () => {
    const y = 590 + Math.pow(r(), 1.3) * 300;
    const s = 3 / depthAt(y);
    const x = r() < 0.5 ? r() * 420 + (r() < 0.5 ? 0 : 1180) : r() * 1600;
    return { x, y, s, a: r() * 180 };
  });
  return (
    <Floor
      id="t"
      far="#94707a"
      near="#26161f"
      joint="#1c0f18"
      edge="#ffc0a0"
      stagger
      seed={4}
      under={
        <>
          <Veil id="t-skyrefl" y0={580} y1={700} color="#f7a184" a={0.3} peak={0.1} />
          <ellipse cx={SUN.x} cy="640" rx="110" ry="70" fill="#ffd09a" opacity="0.18" filter="url(#t-soft)" />
        </>
      }
    >
      <defs>
        <BlurDef id="t-shadow" sd="7" />
      </defs>
      <g fill="#14061a" filter="url(#t-shadow)" opacity="0.45">
        <path d="M566 582 L1034 582 L900 760 L330 760 Z" opacity="0.7" />
        <path d="M0 582 H1600 V606 H0 Z" opacity="0.8" />
        <path d="M118 630 L144 630 L-30 900 L-100 900 Z" />
        <ellipse cx="-10" cy="850" rx="230" ry="60" />
        <path d="M1486 630 L1512 630 L1330 900 L1260 900 Z" />
        <ellipse cx="1270" cy="850" rx="240" ry="60" />
      </g>
      <g fill="#f4a6c4">
        {petals.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={p.s * 1.4} ry={p.s * 0.8} transform={`rotate(${p.a.toFixed(0)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`} opacity="0.7" />
        ))}
      </g>
    </Floor>
  );
}

const CANOPY = [
  [60, 330, 70], [150, 300, 85], [250, 288, 88], [340, 302, 64], [380, 252, 50], [200, 218, 70], [96, 240, 60],
  [300, 216, 58], [16, 268, 56], [232, 362, 52], [128, 372, 50], [36, 394, 40], [404, 330, 40], [-20, 340, 50],
];
const BRANCHES = [
  ["M136 636 C146 560 118 500 156 440 C184 396 220 372 258 350", 26],
  ["M156 450 C116 420 78 404 36 396", 13],
  ["M206 386 C236 332 244 292 234 252", 12],
  ["M246 358 C296 346 336 332 378 302", 11],
  ["M92 414 C76 382 72 352 78 322", 6],
] as const;
const BLOSSOM = ["#a64c7e", "#d06e99", "#f29abd", "#fbbcd2"];

// Backlit cherry: blossom clusters shaded by which way they face the sun.
function CherryTree({ side }: { side: -1 | 1 }) {
  const id = `t-tree${side}`;
  const origin = side < 0 ? 0 : 1630;
  const sx = (x: number) => (side < 0 ? x : origin - x);
  const flip = side < 0 ? undefined : `translate(${origin} 0) scale(-1 1)`;
  const r = rand(side < 0 ? 5 : 9);
  const clumps = CANOPY.map(([x, y, rad], i) => [sx(x), y + (side > 0 ? ((i * 7) % 11) - 5 : 0), rad]);
  const blossoms = clumps
    .flatMap(([x, y, rad]) =>
      Array.from({ length: Math.round(rad / 4) }, () => {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * rad * 0.92;
        const bx = x + Math.cos(a) * d;
        const by = y + Math.sin(a) * d;
        const toSun = Math.hypot(SUN.x - bx, SUN.y - by);
        const lit = (0.9 * ((bx - x) * (SUN.x - bx) + (by - y) * (SUN.y - by))) / toSun / rad - (0.45 * (by - y)) / rad;
        return { bx, by, s: 7 + r() * 12, lit };
      }),
    )
    .sort((a, b) => a.lit - b.lit);
  const tone = (lit: number) => BLOSSOM[lit > 0.62 ? 3 : lit > 0.1 ? 2 : lit > -0.35 ? 1 : 0];
  const fringe = Array.from({ length: 60 }, () => {
    const [x, y, rad] = clumps[Math.floor(r() * clumps.length)];
    const a = 0.15 * Math.PI + r() * 0.7 * Math.PI;
    return [x + Math.cos(a) * rad, y + Math.sin(a) * rad, 2.5 + r() * 4.5];
  });
  return (
    <g>
      <g transform={flip}>
        <ellipse cx="140" cy="636" rx="44" ry="9" fill="#12060f" opacity="0.6" />
        <path d="M120 642 C126 618 150 616 160 642 Z" fill="#1d0c18" />
        <g fill="none" strokeLinecap="round" transform="translate(2.5 -1)" stroke="#e48a80" opacity="0.5">
          {BRANCHES.slice(0, 4).map(([d, w]) => (
            <path key={d} d={d} strokeWidth={w} />
          ))}
        </g>
        <g fill="none" strokeLinecap="round" stroke="#22101e">
          {BRANCHES.map(([d, w]) => (
            <path key={d} d={d} strokeWidth={w} />
          ))}
        </g>
      </g>
      <Noise id={`${id}-bark`} freq="0.08 0.012" seed={side + 3} color="#6a3d52" gain={4} bias={-2.3} opacity={0.7}>
        <path d="M124 640 L152 640 L160 560 L150 470 L132 470 L124 560 Z" transform={flip} />
      </Noise>
      {clumps.map(([x, y, rad], i) => (
        <circle key={i} cx={x} cy={y + rad * 0.06} r={rad * 0.96} fill="#8a3868" />
      ))}
      {blossoms.map(({ bx, by, s, lit }, i) => (
        <circle key={i} cx={bx.toFixed(1)} cy={by.toFixed(1)} r={s.toFixed(1)} fill={tone(lit)} />
      ))}
      <Noise id={`${id}-bloom`} freq="0.14" seed={side + 11} color="#fff0f5" gain={5} bias={-3.4} opacity={0.55}>
        {clumps.map(([x, y, rad], i) => (
          <circle key={i} cx={x} cy={y} r={rad} />
        ))}
      </Noise>
      <Noise id={`${id}-shade`} freq="0.09" seed={side + 21} color="#6e2456" gain={4} bias={-2.5} opacity={0.45}>
        {clumps.map(([x, y, rad], i) => (
          <circle key={i} cx={x} cy={y + rad * 0.1} r={rad} />
        ))}
      </Noise>
      <g fill="#e98bb2">
        {fringe.map(([x, y, s], i) => (
          <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={s.toFixed(1)} />
        ))}
      </g>
    </g>
  );
}

// Near layer: an out-of-focus blossom sprig hanging into a top corner.
export function TempleSprig({ x, seed }: { x: number; seed: number }) {
  const r = rand(seed);
  const dir = x < 800 ? 1 : -1;
  const twig = `M${x - 150 * dir} -20 C${x - 70 * dir} 30 ${x + 10 * dir} 70 ${x + 120 * dir} 170`;
  const blooms = Array.from({ length: 34 }, () => {
    const t = r();
    return [x - 150 * dir + 270 * dir * t + (r() - 0.5) * 70, -20 + 190 * t * t + (r() - 0.5) * 60, 6 + r() * 12];
  });
  return (
    <g filter={`url(#t-dof-${seed})`} opacity="0.92">
      <defs>
        <BlurDef id={`t-dof-${seed}`} sd="3.2" />
      </defs>
      <path d={twig} stroke="#1a0914" strokeWidth="8" fill="none" />
      <path d={`M${x - 40 * dir} 46 C${x - 10 * dir} 80 ${x - 30 * dir} 120 ${x - 50 * dir} 150`} stroke="#1a0914" strokeWidth="5" fill="none" />
      {blooms.map(([bx, by, br], i) => (
        <circle key={i} cx={bx} cy={by} r={br} fill={["#8f3767", "#b85285", "#e38ab0"][i % 3]} />
      ))}
    </g>
  );
}

export function TempleFx() {
  return (
    <>
      <Fog x={420} y={560} w={1200} h={90} color="rgb(246 170 160 / 0.26)" dur={46} />
      <Fog x={1200} y={548} w={900} h={70} color="rgb(255 190 160 / 0.2)" dur={62} delay={-20} />
      <Flicker x={622} y={476} r={70} color="rgb(255 176 90 / 0.5)" />
      <Flicker x={978} y={476} r={70} color="rgb(255 176 90 / 0.5)" delay={-1.7} />
      <Flicker x={492} y={530} r={58} color="rgb(255 176 90 / 0.45)" delay={-0.6} />
      <Flicker x={1108} y={530} r={58} color="rgb(255 176 90 / 0.45)" delay={-2.3} />
    </>
  );
}
