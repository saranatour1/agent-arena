import type { ReactNode } from "react";
import { BlurDef, Flicker, Floor, GlowDef, Noise, Spot, Veil } from "./parts";
import { rand } from "./util";

// Neon rooftop in the rain: the city glows magenta on the horizon, signs throw colored
// light onto the wet roof, and everything near us is a dark silhouette with neon rims.

const MAGENTA = "#ff4fd8";
const CYAN = "#38e1ff";
const GREEN = "#5dff7a";
const YELLOW = "#ffd23f";

type Tower = { x: number; w: number; top: number; seed: number };

const FAR_TOWERS: Tower[] = Array.from({ length: 26 }, (_, i) => {
  const r = rand(100 + i);
  return { x: i * 64 - 30 + r() * 30, w: 40 + r() * 50, top: 150 + r() * 260, seed: 100 + i };
});

const MID_TOWERS: Tower[] = [
  { x: -20, w: 170, top: 250, seed: 1 },
  { x: 140, w: 150, top: 330, seed: 2 },
  { x: 280, w: 230, top: 290, seed: 3 },
  { x: 560, w: 150, top: 430, seed: 4 },
  { x: 900, w: 210, top: 380, seed: 5 },
  { x: 1090, w: 150, top: 220, seed: 6 },
  { x: 1230, w: 190, top: 300, seed: 7 },
  { x: 1410, w: 210, top: 240, seed: 8 },
];

const WINDOW = ["#ffcf7a", "#ffcf7a", "#ffe6b0", "#6fe3ff", "#b48cff", "#ff8fd8"];

function Windows({ t, size, gap, on, opacity }: { t: Tower; size: [number, number]; gap: [number, number]; on: number; opacity: number }) {
  const r = rand(t.seed * 7);
  const out: ReactNode[] = [];
  for (let y = t.top + gap[1]; y < 560; y += gap[1]) {
    for (let x = t.x + gap[0] * 0.6; x < t.x + t.w - size[0] - 4; x += gap[0]) {
      if (r() < on) {
        out.push(<rect key={`${x}:${y}`} x={x.toFixed(1)} y={y.toFixed(1)} width={size[0]} height={size[1]} fill={WINDOW[Math.floor(r() * WINDOW.length)]} />);
      }
    }
  }
  return <g opacity={opacity}>{out}</g>;
}

// A neon tube: wide blurred glow, saturated tube, hot pale core.
function Tube({ d, color, w = 6 }: { d: string; color: string; w?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={color} strokeWidth={w * 3} opacity="0.55" filter="url(#n-bloom)" />
      <path d={d} stroke={color} strokeWidth={w} />
      <path d={d} stroke="#fff" strokeWidth={w * 0.35} opacity="0.75" />
    </g>
  );
}

export function Neon() {
  return (
    <g>
      <Sky />
      <Skyline />
      <Signs />
      <Rooftop />
      <Roof />
      <Rain />
      <Veil id="n-lane" y0={330} y1={800} color="#05030c" a={0.25} peak={0.6} />
    </g>
  );
}

function Sky() {
  return (
    <>
      <defs>
        <linearGradient id="n-sky" x1="0" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#04051a" />
          <stop offset="0.4" stopColor="#120d33" />
          <stop offset="0.75" stopColor="#2c1550" />
          <stop offset="1" stopColor="#6a2468" />
        </linearGradient>
        <GlowDef id="n-city" color="#ff5fae" a={0.55} />
        <linearGradient id="n-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0920" />
          <stop offset="1" stopColor="#3a1a52" />
        </linearGradient>
        <BlurDef id="n-soft" sd="6" />
        <BlurDef id="n-bloom" sd="7" />
      </defs>
      <rect width="1600" height="600" fill="url(#n-sky)" />
      <ellipse cx="800" cy="560" rx="1100" ry="260" fill="url(#n-city)" />
      <g filter="url(#n-soft)" fill="url(#n-cloud)">
        <path d="M-40 90 Q120 40 300 76 Q460 30 640 84 Q760 60 860 100 L860 140 L-40 150 Z" />
        <path d="M980 60 Q1120 20 1260 62 Q1420 34 1640 70 L1640 130 L980 120 Z" />
        <path d="M420 190 Q560 160 700 196 Q820 176 920 206 L900 226 L430 222 Z" opacity="0.7" />
      </g>
    </>
  );
}

function Skyline() {
  return (
    <>
      <defs>
        <linearGradient id="n-far" x1="0" y1="150" x2="0" y2="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2a1e55" />
          <stop offset="1" stopColor="#4a2266" />
        </linearGradient>
        <linearGradient id="n-mid" x1="0" y1="220" x2="0" y2="580" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#151033" />
          <stop offset="1" stopColor="#0b0920" />
        </linearGradient>
      </defs>
      {FAR_TOWERS.map((t) => (
        <g key={t.seed}>
          <rect x={t.x} y={t.top} width={t.w} height={580 - t.top} fill="url(#n-far)" />
          <Windows t={t} size={[3, 4]} gap={[9, 12]} on={0.22} opacity={0.4} />
          {t.seed % 3 === 0 && <line x1={t.x + t.w / 2} y1={t.top} x2={t.x + t.w / 2} y2={t.top - 40} stroke="#2a1e55" strokeWidth="2" />}
        </g>
      ))}
      <Veil id="n-haze" y0={250} y1={580} color="#7a2a78" a={0.55} peak={0.95} />
      {MID_TOWERS.map((t) => (
        <g key={t.seed}>
          <rect x={t.x} y={t.top} width={t.w} height={580 - t.top} fill="url(#n-mid)" />
          <Windows t={t} size={[8, 11]} gap={[17, 23]} on={0.34} opacity={0.75} />
          <rect x={t.x} y={t.top} width={t.w} height="3" fill="#ff7ad8" opacity="0.35" />
          <rect x={t.x - 4} y={t.top - 6} width={t.w + 8} height="6" fill="#1b1440" />
          <rect x={t.x + t.w - 3} y={t.top} width="3" height={580 - t.top} fill="#7ad8ff" opacity="0.12" />
        </g>
      ))}
      <g stroke="#1b1440" strokeWidth="3">
        <line x1="1165" y1="220" x2="1165" y2="120" />
        <line x1="1515" y1="240" x2="1515" y2="150" />
        <line x1="95" y1="250" x2="95" y2="170" />
      </g>
      <g fill="#ff3b3b">
        <circle cx="1165" cy="118" r="3" />
        <circle cx="1515" cy="148" r="3" />
        <circle cx="95" cy="168" r="3" />
      </g>
    </>
  );
}

function Signs() {
  return (
    <g>
      <defs>
        <GlowDef id="n-pink" color={MAGENTA} a={0.5} />
        <GlowDef id="n-cyan" color={CYAN} a={0.45} />
      </defs>
      <ellipse cx="464" cy="290" rx="190" ry="230" fill="url(#n-pink)" />
      <ellipse cx="630" cy="250" rx="170" ry="160" fill="url(#n-pink)" opacity="0.8" />
      <ellipse cx="1035" cy="232" rx="220" ry="150" fill="url(#n-cyan)" />
      {/* vertical blade sign */}
      <g stroke="#0d0a22" strokeWidth="4">
        <line x1="420" y1="210" x2="440" y2="210" />
        <line x1="420" y1="390" x2="440" y2="390" />
      </g>
      <rect x="440" y="176" width="50" height="236" rx="6" fill="#140c2e" />
      <Tube d="M444 182 H486 V406 H444 Z" color={MAGENTA} w={5} />
      <Tube d="M465 198 L476 212 L465 226 L454 212 Z M471 244 L457 266 L468 266 L459 288 L476 260 L465 260 Z M454 318 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M455 354 H475 M455 368 H475 M455 382 H475" color="#ffb3ef" w={4} />
      {/* Jev's ring on a lattice tower */}
      <g stroke="#120c2a" strokeWidth="5">
        <line x1="596" y1="300" x2="584" y2="432" />
        <line x1="664" y1="300" x2="676" y2="432" />
        <path d="M592 340 L668 380 M590 380 L670 410 M668 340 L592 380 M670 380 L588 410" strokeWidth="2.5" />
      </g>
      <Tube d="M630 196 m-52 0 a52 52 0 1 0 104 0 a52 52 0 1 0 -104 0" color={MAGENTA} w={7} />
      <Tube d="M606 178 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M654 216 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M606 228 L654 166" color={GREEN} w={6} />
      {/* billboard box (the zigzag tube is the flickering layer above) */}
      <g stroke="#120c2a" strokeWidth="5">
        <line x1="985" y1="270" x2="975" y2="382" />
        <line x1="1085" y1="270" x2="1095" y2="382" />
        <line x1="980" y1="320" x2="1090" y2="320" strokeWidth="3" />
      </g>
      <rect x="958" y="196" width="154" height="74" rx="12" fill="#0d0a24" />
      <Tube d="M970 200 H1100 Q1108 200 1108 208 V258 Q1108 266 1100 266 H970 Q962 266 962 258 V208 Q962 200 970 200 Z" color={CYAN} w={6} />
      <path d="M985 250 l20 -30 l20 30 l20 -30 l20 30 l20 -30" stroke="#5a4a1a" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* light the facades under the signs */}
      <rect x="280" y="290" width="230" height="290" fill={MAGENTA} opacity="0.07" />
      <rect x="900" y="380" width="210" height="200" fill={CYAN} opacity="0.07" />
    </g>
  );
}

function Rooftop() {
  return (
    <g>
      <defs>
        <linearGradient id="n-tank" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a1a4a" />
          <stop offset="0.35" stopColor="#1a1230" />
          <stop offset="1" stopColor="#0c0a1c" />
        </linearGradient>
        <GlowDef id="n-bulb" color="#ffcf8a" a={0.55} />
      </defs>
      {/* parapet with a rail along the roof edge */}
      <rect y="548" width="1600" height="34" fill="#141026" />
      <rect y="546" width="1600" height="4" fill="#2a2150" />
      <rect y="546" width="1600" height="1.5" fill="#ff8fe0" opacity="0.4" />
      <g stroke="#221b44" strokeWidth="4">
        <line x1="0" y1="512" x2="1600" y2="512" />
        {Array.from({ length: 21 }, (_, i) => (
          <line key={i} x1={i * 80 + 20} y1="512" x2={i * 80 + 20} y2="548" />
        ))}
      </g>
      <line x1="0" y1="511" x2="1600" y2="511" stroke="#ff8fe0" strokeWidth="1" opacity="0.35" />
      {/* stair shed with a caged bulb */}
      <rect x="90" y="430" width="200" height="150" fill="#120e26" />
      <path d="M80 432 L300 432 L290 418 L90 418 Z" fill="#1d1640" />
      <rect x="150" y="470" width="60" height="110" fill="#0a0818" />
      <rect x="150" y="470" width="60" height="110" fill="none" stroke="#2a2150" strokeWidth="3" />
      <ellipse cx="180" cy="456" rx="120" ry="110" fill="url(#n-bulb)" />
      <circle cx="180" cy="456" r="5" fill="#fff0c8" />
      <path d="M150 466 L210 466 L250 580 L110 580 Z" fill="#ffcf8a" opacity="0.07" />
      <rect x="287" y="432" width="3" height="148" fill={MAGENTA} opacity="0.35" />
      {/* AC units */}
      {[330, 1150].map((x) => (
        <g key={x}>
          <rect x={x} y="530" width="96" height="52" fill="#1a1534" />
          <circle cx={x + 30} cy="556" r="18" fill="#0c0a1c" stroke="#2c2556" strokeWidth="3" />
          <path d={`M${x + 18} 556 H${x + 42} M${x + 30} 544 V568`} stroke="#2c2556" strokeWidth="2" />
          <path d={`M${x + 58} 540 h28 M${x + 58} 548 h28 M${x + 58} 556 h28 M${x + 58} 564 h28`} stroke="#2c2556" strokeWidth="2" />
          <rect x={x} y="530" width="96" height="2" fill="#ff8fe0" opacity="0.4" />
        </g>
      ))}
      {/* vent pipes */}
      <g fill="#1a1534">
        <rect x="760" y="520" width="16" height="62" />
        <rect x="754" y="514" width="28" height="10" rx="3" />
        <rect x="830" y="534" width="12" height="48" />
        <rect x="825" y="528" width="22" height="8" rx="3" />
      </g>
      {/* water tower */}
      <g>
        <g stroke="#0e0b20" strokeWidth="6">
          <line x1="1290" y1="420" x2="1280" y2="582" />
          <line x1="1390" y1="420" x2="1400" y2="582" />
          <line x1="1340" y1="420" x2="1340" y2="582" />
          <path d="M1286 460 L1394 520 M1394 460 L1286 520 M1282 530 L1398 570 M1398 530 L1282 570" strokeWidth="3" />
        </g>
        <g stroke={MAGENTA} strokeWidth="1.5" opacity="0.45">
          <line x1="1287" y1="420" x2="1277" y2="582" />
          <line x1="1337" y1="420" x2="1337" y2="582" />
        </g>
        <g stroke={CYAN} strokeWidth="1.5" opacity="0.3">
          <line x1="1393" y1="420" x2="1403" y2="582" />
        </g>
        <rect x="1272" y="300" width="136" height="122" rx="6" fill="url(#n-tank)" />
        <path d={Array.from({ length: 12 }, (_, i) => `M${1282 + i * 11} 304 V418`).join(" ")} stroke="#000" strokeWidth="1.5" opacity="0.35" />
        {[318, 360, 402].map((y) => (
          <rect key={y} x="1270" y={y} width="140" height="5" fill="#2a2150" />
        ))}
        <path d="M1264 302 L1340 252 L1416 302 Z" fill="#160f30" />
        <path d="M1264 302 L1340 252 L1346 256 L1276 302 Z" fill={MAGENTA} opacity="0.45" />
        <rect x="1272" y="300" width="4" height="122" fill={MAGENTA} opacity="0.5" />
        <rect x="1404" y="300" width="4" height="122" fill={CYAN} opacity="0.35" />
      </g>
      <Noise id="n-grime" freq="0.05 0.2" seed={8} color="#000000" gain={3} bias={-1.4} opacity={0.5}>
        <rect x="90" y="418" width="210" height="164" />
        <rect x="1264" y="252" width="152" height="170" />
        <rect y="546" width="1600" height="36" />
      </Noise>
      {/* string lights */}
      <path d="M290 420 Q470 470 640 436" stroke="#0e0b20" strokeWidth="2" fill="none" />
      <g fill="#ffd9a0">
        {[0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94].map((t) => {
          const x = (1 - t) ** 2 * 290 + 2 * (1 - t) * t * 470 + t * t * 640;
          const y = (1 - t) ** 2 * 420 + 2 * (1 - t) * t * 470 + t * t * 436 + 5;
          return <circle key={t} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.2" />;
        })}
      </g>
    </g>
  );
}

function Roof() {
  const r = rand(77);
  return (
    <Floor
      id="n"
      far="#3a2e55"
      near="#0a0814"
      joint="#05040c"
      edge="#9c7cd8"
      tile={0.55}
      seed={21}
      mottle={0.65}
      freq="0.005 0.03"
      under={<Veil id="n-sheen" y0={580} y1={760} color="#a03a90" a={0.45} peak={0.08} />}
    >
      <defs>
        <BlurDef id="n-streak" sd="9 3" />
        <BlurDef id="n-puddle" sd="2" />
        <linearGradient id="n-fade" x1="0" y1="585" x2="0" y2="880" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="n-fade-mask">
          <rect y="580" width="1600" height="320" fill="url(#n-fade)" />
        </mask>
      </defs>
      <g mask="url(#n-fade-mask)" filter="url(#n-streak)">
        <rect x="446" y="586" width="36" height="260" fill={MAGENTA} opacity="0.42" />
        <rect x="590" y="586" width="80" height="200" fill={MAGENTA} opacity="0.3" />
        <rect x="618" y="590" width="24" height="170" fill={GREEN} opacity="0.3" />
        <rect x="968" y="586" width="134" height="230" fill={CYAN} opacity="0.3" />
        <rect x="1010" y="590" width="50" height="190" fill={YELLOW} opacity="0.18" />
        <rect x="165" y="586" width="30" height="150" fill="#ffcf8a" opacity="0.3" />
        <rect x="1270" y="586" width="12" height="160" fill={MAGENTA} opacity="0.3" />
      </g>
      {[
        [520, 700, 170, 16],
        [1080, 770, 210, 22],
        [260, 652, 110, 10],
        [1420, 680, 120, 11],
      ].map(([cx, cy, rx, ry]) => (
        <g key={cx}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#04030a" opacity="0.28" filter="url(#n-puddle)" />
          <ellipse cx={cx} cy={cy - ry * 0.25} rx={rx * 0.9} ry={ry * 0.6} fill="none" stroke="#c9a6ff" strokeWidth="1" opacity="0.15" />
        </g>
      ))}
      <ellipse cx="465" cy="702" rx="22" ry="7" fill={MAGENTA} opacity="0.45" filter="url(#n-streak)" />
      <ellipse cx="1036" cy="770" rx="60" ry="9" fill={CYAN} opacity="0.4" filter="url(#n-streak)" />
      <g stroke="#cfd6ff" strokeWidth="1" opacity="0.18">
        {Array.from({ length: 40 }, (_, i) => {
          const x = r() * 1600;
          const y = 600 + r() * 280;
          const s = (y - 470) / 160;
          return <ellipse key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} rx={(5 * s).toFixed(1)} ry={(1.4 * s).toFixed(1)} fill="none" />;
        })}
      </g>
    </Floor>
  );
}

function Rain() {
  const r = rand(55);
  return (
    <g stroke="#b9c4ff" strokeWidth="1" strokeLinecap="round">
      {Array.from({ length: 160 }, (_, i) => {
        const x = r() * 1700;
        const y = r() * 900;
        const len = 12 + r() * 22;
        return <line key={i} x1={x.toFixed(1)} y1={y.toFixed(1)} x2={(x - len * 0.2).toFixed(1)} y2={(y + len).toFixed(1)} opacity={(0.06 + r() * 0.14).toFixed(2)} />;
      })}
    </g>
  );
}

// The billboard's zigzag tube, on its own layer so it can buzz like a failing ballast.
export function NeonBuzz() {
  return (
    <g>
      <defs>
        <BlurDef id="n-buzz" sd="7" />
      </defs>
      <ellipse cx="1035" cy="235" rx="120" ry="70" fill={YELLOW} opacity="0.12" filter="url(#n-buzz)" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M985 250 l20 -30 l20 30 l20 -30 l20 30 l20 -30" stroke={YELLOW} strokeWidth="16" opacity="0.5" filter="url(#n-buzz)" />
        <path d="M985 250 l20 -30 l20 30 l20 -30 l20 30 l20 -30" stroke={YELLOW} strokeWidth="5" />
        <path d="M985 250 l20 -30 l20 30 l20 -30 l20 30 l20 -30" stroke="#fff" strokeWidth="1.8" opacity="0.8" />
      </g>
    </g>
  );
}

export function NeonFx() {
  return (
    <>
      <Flicker x={464} y={290} r={200} color="rgb(255 79 216 / 0.16)" kind="amb-hum" />
      <Flicker x={630} y={200} r={150} color="rgb(255 79 216 / 0.14)" kind="amb-hum" delay={-2.2} />
      <Flicker x={1035} y={232} r={190} color="rgb(56 225 255 / 0.14)" kind="amb-hum" delay={-1.1} />
      {[
        [1165, 118],
        [1515, 148],
        [95, 168],
      ].map(([x, y], i) => (
        <Flicker key={x} x={x} y={y} r={14} color="rgb(255 70 70 / 0.9)" kind="amb-blink" delay={-i * 0.7} />
      ))}
      <Spot x={768} y={470} w={90} h={130} className="amb-rise rounded-full" style={{ background: "radial-gradient(closest-side, rgb(200 190 255 / 0.22), transparent)" }} />
      <Spot x={836} y={490} w={70} h={110} className="amb-rise rounded-full" style={{ background: "radial-gradient(closest-side, rgb(200 190 255 / 0.18), transparent)", animationDelay: "-2.5s" }} />
      {[
        [500, 700],
        [1110, 772],
        [270, 652],
        [1060, 765],
        [1410, 682],
      ].map(([x, y], i) => (
        <Spot
          key={x}
          x={x}
          y={y}
          w={46}
          h={10}
          className="amb-ripple rounded-[50%] border border-[rgb(210_200_255/0.5)]"
          style={{ animationDelay: `${-i * 0.37}s` }}
        />
      ))}
    </>
  );
}
