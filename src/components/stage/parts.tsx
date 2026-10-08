import type { CSSProperties, ReactNode } from "react";
import { HORIZON, depthAt, ground, rand, rgb } from "./util";

// Radial falloff for lights; objectBoundingBox units so one def serves any ellipse.
export function GlowDef({ id, color, a = 1 }: { id: string; color: string; a?: number }) {
  return (
    <radialGradient id={id}>
      <stop offset="0" stopColor={color} stopOpacity={a} />
      <stop offset="0.3" stopColor={color} stopOpacity={a * 0.45} />
      <stop offset="0.65" stopColor={color} stopOpacity={a * 0.12} />
      <stop offset="1" stopColor={color} stopOpacity="0" />
    </radialGradient>
  );
}

export function BlurDef({ id, sd }: { id: string; sd: number | string }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={sd} />
    </filter>
  );
}

// Vertical veil between depth layers (atmospheric perspective, mist, lane dimming).
export function Veil({ id, y0, y1, color, a, peak = 0.5 }: { id: string; y0: number; y1: number; color: string; a: number; peak?: number }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1={y0} x2="0" y2={y1} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset={peak} stopColor={color} stopOpacity={a} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect y={y0} width="1600" height={y1 - y0} fill={`url(#${id})`} />
    </>
  );
}

// Static surface texture: fractal noise tinted `color`, clipped to the children's shapes.
export function Noise({
  id,
  freq,
  octaves = 3,
  seed = 1,
  color = "#000000",
  gain = 3,
  bias = -1.5,
  opacity = 1,
  children,
}: {
  id: string;
  freq: string;
  octaves?: number;
  seed?: number;
  color?: string;
  gain?: number;
  bias?: number;
  opacity?: number;
  children: ReactNode;
}) {
  const [r, g, b] = rgb(color);
  return (
    <>
      <defs>
        <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={octaves} seed={seed} />
          <feColorMatrix values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${gain} 0 0 0 ${bias}`} />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`} opacity={opacity}>
        {children}
      </g>
    </>
  );
}

// God rays fanning out from a light; one radial gradient fades every ray with distance.
export function Shafts({
  id,
  x,
  y,
  rays,
  color,
  a,
  blur = 10,
}: {
  id: string;
  x: number;
  y: number;
  rays: [deg: number, spread: number, len: number][];
  color: string;
  a: number;
  blur?: number;
}) {
  const at = (deg: number, len: number) => {
    const t = (deg * Math.PI) / 180;
    return `${(x + Math.cos(t) * len).toFixed(1)},${(y + Math.sin(t) * len).toFixed(1)}`;
  };
  const far = Math.max(...rays.map(([, , len]) => len));
  return (
    <>
      <defs>
        <radialGradient id={`${id}-g`} cx={x} cy={y} r={far} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity={a} />
          <stop offset="0.45" stopColor={color} stopOpacity={a * 0.45} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <BlurDef id={`${id}-b`} sd={blur} />
      </defs>
      <g fill={`url(#${id}-g)`} filter={`url(#${id}-b)`}>
        {rays.map(([deg, spread, len]) => (
          <polygon key={deg} points={`${x},${y} ${at(deg - spread, len)} ${at(deg + spread, len)}`} />
        ))}
      </g>
    </>
  );
}

const TILE_ROWS = (tile: number) => {
  const out: [number, number][] = [];
  for (let z = depthAt(HORIZON); z > 0.6; z -= tile) out.push([z, Math.max(z - tile, 0.5)]);
  return out;
};

// Perspective ground plane: tinted flagstones, joints, bevels, stone texture, contact shadow.
export function Floor({
  id,
  far,
  near,
  joint,
  edge,
  tile = 0.45,
  stagger = false,
  seed = 1,
  mottle = 0.5,
  grain = 0.18,
  freq = "0.004 0.016",
  under,
  children,
}: {
  id: string;
  far: string;
  near: string;
  joint: string;
  edge: string;
  tile?: number;
  stagger?: boolean;
  seed?: number;
  mottle?: number;
  grain?: number;
  freq?: string;
  under?: ReactNode;
  children?: ReactNode;
}) {
  const r = rand(seed);
  const rows = TILE_ROWS(tile);
  const tiles: ReactNode[] = [];
  const joints: string[] = [];
  const bevels: string[] = [];
  rows.forEach(([za, zb], row) => {
    const shift = stagger && row % 2 ? tile / 2 : 0;
    const [, ya] = ground(0, za);
    const [, yb] = ground(0, zb);
    joints.push(`M0 ${ya.toFixed(1)} H1600`);
    bevels.push(`M0 ${(ya + 2.2 / za).toFixed(1)} H1600`);
    const span = (800 * za) / 430 + tile;
    for (let x = -Math.ceil(span / tile) * tile + shift; x < span; x += tile) {
      const [a] = ground(x, za);
      const [b] = ground(x + tile, za);
      const [c] = ground(x + tile, zb);
      const [d] = ground(x, zb);
      if (Math.max(b, c) < 0 || Math.min(a, d) > 1600) continue;
      const v = r();
      tiles.push(
        <polygon
          key={`${row}:${x.toFixed(2)}`}
          points={`${a.toFixed(1)},${ya.toFixed(1)} ${b.toFixed(1)},${ya.toFixed(1)} ${c.toFixed(1)},${yb.toFixed(1)} ${d.toFixed(1)},${yb.toFixed(1)}`}
          fill={v < 0.55 ? "#000" : "#fff"}
          opacity={v < 0.55 ? v * 0.22 : (v - 0.55) * 0.13}
        />,
      );
      joints.push(`M${a.toFixed(1)} ${ya.toFixed(1)} L${d.toFixed(1)} ${yb.toFixed(1)}`);
    }
  });
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-floor`} x1="0" y1={HORIZON} x2="0" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={far} />
          <stop offset="1" stopColor={near} />
        </linearGradient>
        <linearGradient id={`${id}-ao`} x1="0" y1={HORIZON} x2="0" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.09" stopColor="#000" stopOpacity="0" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect y={HORIZON} width="1600" height={900 - HORIZON} fill={`url(#${id}-floor)`} />
      {under}
      {tiles}
      <Noise id={`${id}-mottle`} freq={freq} octaves={4} seed={seed} gain={2.4} bias={-1.1} opacity={mottle}>
        <rect y={HORIZON} width="1600" height={900 - HORIZON} />
      </Noise>
      <Noise id={`${id}-grain`} freq="0.5 0.9" octaves={2} seed={seed + 7} color="#ffffff" gain={4} bias={-2.3} opacity={grain}>
        <rect y={HORIZON} width="1600" height={900 - HORIZON} />
      </Noise>
      <path d={bevels.join(" ")} stroke={edge} strokeWidth="1.4" opacity="0.35" />
      <path d={joints.join(" ")} stroke={joint} strokeWidth="2" opacity="0.7" fill="none" />
      {children}
      <rect y={HORIZON} width="1600" height={900 - HORIZON} fill={`url(#${id}-ao)`} />
    </g>
  );
}

// Live-only ambient element placed in stage coordinates (centre x/y, size w/h).
export function Spot({ x, y, w, h, className, style }: { x: number; y: number; w: number; h: number; className: string; style?: CSSProperties }) {
  return (
    <span
      className={`absolute ${className}`}
      style={{ left: `${(x - w / 2) / 16}%`, top: `${(y - h / 2) / 9}%`, width: `${w / 16}%`, height: `${h / 9}%`, ...style }}
    />
  );
}

// A flickering pool of light over a lantern, brazier or sign.
export function Flicker({ x, y, r, color, delay = 0, kind = "amb-flicker" }: { x: number; y: number; r: number; color: string; delay?: number; kind?: string }) {
  return (
    <Spot
      x={x}
      y={y}
      w={r * 2}
      h={r * 2}
      className={`${kind} rounded-full`}
      style={{ background: `radial-gradient(closest-side, ${color}, transparent)`, animationDelay: `${delay}s` }}
    />
  );
}

// A drifting band of mist.
export function Fog({ x, y, w, h, color, dur, delay = 0 }: { x: number; y: number; w: number; h: number; color: string; dur: number; delay?: number }) {
  return (
    <Spot
      x={x}
      y={y}
      w={w}
      h={h}
      className="amb-drift"
      style={{ background: `radial-gradient(closest-side, ${color}, transparent)`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
    />
  );
}
