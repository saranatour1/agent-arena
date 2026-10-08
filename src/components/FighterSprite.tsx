import { useId, type ReactNode } from "react";
import { FIGHTERS, PLAYER, type FighterId } from "../../convex/game/fighters";
import { POSES, type Pose, type PoseName, type Pt } from "../game/poses";
import { useFighterPose } from "../hooks/useFighterPose";
import type { CostumeId } from "../../convex/game/progress";

export type Combatant = FighterId | "player";

// ---------------------------------------------------------------- looks

type Look = {
  skin: string;
  top: string;
  upperArm: string;
  forearm: string;
  hand: string;
  thigh: string;
  shin: string;
  foot: string;
  scale: number;
  sleeveW?: number;
};

const CLAN = "#d97757"; // Claude clan terracotta
const GOLD = "#e0b23a";
const INK = "#140b0b";

const LOOKS: Record<Combatant, Look> = {
  player: {
    skin: "#e8b48a", top: "#d81e2a", upperArm: "#e8b48a", forearm: "#e8b48a",
    hand: "#c4141f", thigh: "#1b1b1f", shin: "#1b1b1f", foot: "#e8b48a", scale: 1,
  },
  haiku: {
    skin: "#f1c9a5", top: "#2ec5e8", upperArm: "#2ec5e8", forearm: "#1785a6",
    hand: "#1c2430", thigh: "#efe6d8", shin: "#1785a6", foot: "#1c2430", scale: 0.96,
  },
  sonnet: {
    skin: "#eec39c", top: "#c8643c", upperArm: "#f4efe6", forearm: "#f4efe6",
    hand: "#6b3a1e", thigh: "#2f2f38", shin: "#6b3a1e", foot: "#4a2712", scale: 1,
    sleeveW: 16,
  },
  opus: {
    skin: "#d9a77f", top: "#3b2266", upperArm: "#3b2266", forearm: "#4b2a7a",
    hand: GOLD, thigh: "#24163d", shin: GOLD, foot: "#8a6d12", scale: 1.12,
    sleeveW: 15,
  },
  jev: {
    skin: "#2b303b", top: "#2f3542", upperArm: "#3a4150", forearm: "#3a4150",
    hand: "#23262e", thigh: "#343a47", shin: "#3a4150", foot: "#15171c", scale: 1,
  },
};

// The challenger's unlockable costumes (top / pants / wraps+headband / flames).
const COSTUME_LOOK: Record<CostumeId, Partial<Look> & { band: string; flame: [string, string] }> = {
  crimson: { top: "#d81e2a", thigh: "#1b1b1f", shin: "#1b1b1f", hand: "#c4141f", band: "#d81e2a", flame: ["#ff8a00", "#ffd23f"] },
  midnight: { top: "#1e3a8a", thigh: "#0f172a", shin: "#0f172a", hand: "#3b82f6", band: "#60a5fa", flame: ["#38bdf8", "#e0f2fe"] },
  jade: { top: "#15803d", thigh: "#052e16", shin: "#052e16", hand: "#22c55e", band: "#4ade80", flame: ["#a3e635", "#ecfccb"] },
  gold: { top: "#c99a06", thigh: "#2a210a", shin: "#2a210a", hand: "#fde047", band: "#fde047", flame: ["#f97316", "#fef08a"] },
  void: { top: "#4c1d95", thigh: "#0b0618", shin: "#0b0618", hand: "#c084fc", band: "#a855f7", flame: ["#e879f9", "#f5d0fe"] },
};

// ---------------------------------------------------------------- geometry

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const lerp = (a: Pt, b: Pt, t: number): Pt => add(a, mul(sub(b, a), t));
const deg = (v: Pt) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
const norm = (v: Pt): Pt => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

function Bone({ a, b, w, color, shade = false }: { a: Pt; b: Pt; w: number; color: string; shade?: boolean }) {
  const p = { x1: a[0], y1: a[1], x2: b[0], y2: b[1], strokeLinecap: "round" as const };
  return (
    <>
      <line {...p} stroke={INK} strokeWidth={w + 3.5} />
      <line {...p} stroke={color} strokeWidth={w} />
      <line {...p} stroke="rgba(255,255,255,.22)" strokeWidth={w * 0.3} transform="translate(-1.2 -1.2)" />
      {shade && <line {...p} stroke="rgba(0,0,0,.28)" strokeWidth={w} />}
    </>
  );
}

function Foot({ knee, foot, color, shade }: { knee: Pt; foot: Pt; color: string; shade?: boolean }) {
  const a = deg(sub(foot, knee)) - 90;
  return (
    <g transform={`translate(${foot[0]} ${foot[1]}) rotate(${a})`}>
      <ellipse cx={5.5} cy={-3} rx={10} ry={5.4} fill={color} stroke={INK} strokeWidth={2.2} />
      {shade && <ellipse cx={5.5} cy={-3} rx={10} ry={5.4} fill="rgba(0,0,0,.28)" />}
    </g>
  );
}

function Hand({ at, color, r = 6.8, shade }: { at: Pt; color: string; r?: number; shade?: boolean }) {
  return (
    <>
      <circle cx={at[0]} cy={at[1]} r={r} fill={color} stroke={INK} strokeWidth={2.2} />
      <circle cx={at[0] - 1.6} cy={at[1] - 1.8} r={r * 0.35} fill="rgba(255,255,255,.3)" />
      {shade && <circle cx={at[0]} cy={at[1]} r={r} fill="rgba(0,0,0,.28)" />}
    </>
  );
}

// A piece of cloth that sways forever (scarf, headband tails, cape hem).
function Sway({ at, deg: amp, dur, children }: { at: Pt; deg: number; dur: number; children: ReactNode }) {
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`${-amp};${amp};${-amp}`}
          dur={`${dur}s`}
          repeatCount="indefinite"
        />
        {children}
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- heads
// Drawn upright around (0,0), face toward +x; rotated with the neck.

function Head({
  who,
  look,
  glowId,
  band = "#d81e2a",
  flash = 0,
}: {
  who: Combatant;
  look: Look;
  glowId: string;
  band?: string;
  flash?: number;
}) {
  const skull = <circle r={12.5} fill={look.skin} stroke={INK} strokeWidth={2.4} />;
  const eye = (fill = "#111") => <rect x={4.5} y={-2.5} width={4.2} height={2.6} rx={0.6} fill={fill} />;
  switch (who) {
    case "player":
      return (
        <g>
          <Sway at={[-12, -4]} deg={9} dur={0.9}>
            <path d="M0 -1 q -10 -3 -19 3 l 2 3 q 8 -5 17 -2 z" fill={band} stroke={INK} strokeWidth={1.4} />
            <path d="M0 1 q -9 1 -16 9 l 3 2 q 6 -7 13 -8 z" fill={band} stroke={INK} strokeWidth={1.4} opacity={0.85} />
          </Sway>
          {skull}
          <path
            d="M-13 -1 L-17 -13 L-9 -10 L-7 -20 L0 -13 L5 -20 L8 -11 L15 -12 L12 -3 Q2 -13 -13 -1 Z"
            fill="#111" stroke={INK} strokeWidth={1.5}
          />
          <rect x={-12.6} y={-7} width={25.2} height={4.2} rx={1} fill={band} stroke={INK} strokeWidth={1.2} />
          {eye()}
          <line x1={3} y1={-5.2} x2={9.5} y2={-4.2} stroke="#111" strokeWidth={1.6} />
          <line x1={6} y1={6} x2={10} y2={5.4} stroke="#7a2b1f" strokeWidth={1.4} />
        </g>
      );
    case "haiku":
      return (
        <g>
          <Sway at={[-12, -3]} deg={7} dur={1.1}>
            <path d="M0 0 l -12 -6 l 1 6 z" fill="#1785a6" stroke={INK} strokeWidth={1.2} />
            <path d="M0 2 l -11 4 l 3 -7 z" fill="#1785a6" stroke={INK} strokeWidth={1.2} />
          </Sway>
          <circle r={13.6} fill="#2ec5e8" stroke={INK} strokeWidth={2.4} />
          <rect x={0.5} y={-6} width={13} height={6.5} rx={2.5} fill={look.skin} />
          {eye()}
          <line x1={3.5} y1={-5} x2={10} y2={-4.4} stroke="#111" strokeWidth={1.3} />
          <path d="M-1 1 L13.4 1 Q12.6 10 4 12.6 L-1 12 Z" fill="#efe6d8" stroke={INK} strokeWidth={1.4} />
          <circle cx={-6} cy={-9} r={2.6} fill="#ff9fc8" stroke={INK} strokeWidth={0.8} />
          <circle cx={-6} cy={-9} r={0.9} fill="#fff4a3" />
        </g>
      );
    case "sonnet":
      return (
        <g>
          <g transform="rotate(-28)">
            <path d="M-6 -10 Q-14 -30 -10 -44 Q-2 -30 -4 -10 Z" fill="#fbf7ee" stroke={INK} strokeWidth={1.3} />
            <line x1={-5} y1={-10} x2={-10} y2={-42} stroke="#9a8f7a" strokeWidth={0.9} />
          </g>
          {skull}
          <path
            d="M-13 3 Q-15 -14 2 -14.5 Q13 -14 14 -5 Q5 -10 -1 -6 Q-6 1 -13 3 Z"
            fill="#8a3b1c" stroke={INK} strokeWidth={1.5}
          />
          {eye()}
          <path d="M3 -5.6 Q6 -7 9.6 -5" stroke="#5a2410" strokeWidth={1.6} fill="none" />
          <path d="M5 6 Q9 13 11 7 Z" fill="#8a3b1c" stroke={INK} strokeWidth={1} />
          <line x1={6.5} y1={5} x2={10.5} y2={4.6} stroke="#7a2b1f" strokeWidth={1.2} />
        </g>
      );
    case "opus":
      return (
        <g>
          <path d="M-12 -5 Q-20 8 -11 18 L-4 15 Q-11 5 -8 -5 Z" fill="#ece8f4" stroke={INK} strokeWidth={1.4} />
          {skull}
          <path d="M1 3 L13.5 2 Q12 15 5 19 Q1 13 1 3 Z" fill="#ece8f4" stroke={INK} strokeWidth={1.4} />
          <rect x={-12.5} y={-10} width={25} height={4.6} rx={1} fill={GOLD} stroke={INK} strokeWidth={1.3} />
          <path
            d="M-10 -10 L-8 -19 L-5 -10 M-2.5 -10 L0 -23 L2.5 -10 M5 -10 L8 -19 L10 -10"
            fill={GOLD} stroke={INK} strokeWidth={1.3} strokeLinejoin="round"
          />
          <circle cx={0} cy={-7.7} r={1.8} fill={CLAN} stroke={INK} strokeWidth={0.6} />
          {eye("#b77dff")}
          <line x1={2.5} y1={-5.6} x2={10.5} y2={-3.8} stroke="#ece8f4" strokeWidth={2.2} />
        </g>
      );
    case "jev":
      return (
        <g>
          <line x1={-6} y1={-11} x2={-11} y2={-23} stroke={INK} strokeWidth={2} />
          <circle cx={-11} cy={-24} r={2.4 + flash * 1.6} fill="#5dff7a" filter={`url(#${glowId})`} />
          <circle r={13.2} fill="#15171c" stroke={INK} strokeWidth={2.4} />
          <path d="M-12 -3 Q-6 -15 6 -12" stroke="#2a2e38" strokeWidth={2} fill="none" />
          <rect x={-0.5} y={-6} width={14.4} height={6} rx={2.4} fill="#5dff7a" filter={`url(#${glowId})`} />
          <rect x={2} y={-4.6} width={1.6} height={3.2} fill="#0b3a17" />
          <rect x={5} y={-3.4} width={1.6} height={2} fill="#0b3a17" />
          <rect x={8} y={-5} width={1.6} height={3.6} fill="#0b3a17" />
          <rect x={11} y={-2.6} width={1.6} height={1.2} fill="#0b3a17" />
          {flash > 0 && (
            <rect
              x={-2.5} y={-8} width={18.4} height={10} rx={4}
              fill="#eafff0" opacity={flash * 0.85} filter={`url(#${glowId})`}
            />
          )}
        </g>
      );
  }
}

// ---------------------------------------------------------------- body extras

function BackLayer({ who, p }: { who: Combatant; p: Pose }) {
  if (who === "opus") {
    const shoulder = add(p.N, [-8, 2]);
    const b = p.billow ?? 0; // the hem lifts and flares out behind
    return (
      <path
        d={`M ${shoulder[0]} ${shoulder[1]} L ${p.N[0] + 6} ${p.N[1] + 2} L ${p.P[0] + 2} ${p.P[1] + 8}
            Q ${p.P[0] - 10 - 8 * b} ${200 - 6 * b} ${p.P[0] - 44 - 22 * b} ${203 - 30 * b}
            Q ${p.P[0] - 40 - 18 * b} ${150 - 14 * b} ${shoulder[0] - 8 - 4 * b} ${shoulder[1] + 18} Z`}
        fill="#2a1450" stroke={INK} strokeWidth={2.4} strokeLinejoin="round"
      />
    );
  }
  if (who === "haiku") {
    return (
      <Sway at={add(p.N, [-4, 2])} deg={10} dur={1}>
        <path d="M0 0 C -14 2 -22 10 -36 6 L -34 12 C -22 16 -12 8 0 6 Z" fill="#ff9fc8" stroke={INK} strokeWidth={1.6} />
      </Sway>
    );
  }
  return null;
}

function TorsoDetails({ who, p, perp }: { who: Combatant; p: Pose; perp: Pt }) {
  const at = (t: number, s: number) => add(lerp(p.N, p.P, t), mul(perp, s));
  const beltA = at(0.93, 13);
  const beltB = at(0.93, -13);
  const belt = (color: string) => (
    <line x1={beltA[0]} y1={beltA[1]} x2={beltB[0]} y2={beltB[1]} stroke={color} strokeWidth={5} strokeLinecap="round" />
  );
  switch (who) {
    case "player": {
      const v1 = at(0, 6);
      const v2 = at(0.32, 0);
      const v3 = at(0, -6);
      return (
        <>
          <path d={`M${v1[0]} ${v1[1]} L${v2[0]} ${v2[1]} L${v3[0]} ${v3[1]} Z`} fill="#e8b48a" />
          {belt("#111")}
        </>
      );
    }
    case "haiku": {
      const a = at(0.05, -12);
      const b = at(0.85, 9);
      return (
        <>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={CLAN} strokeWidth={5} strokeLinecap="round" />
          {belt(CLAN)}
        </>
      );
    }
    case "sonnet": {
      return (
        <>
          {[0.25, 0.45, 0.65].map((t) => {
            const b = at(t, 3);
            return <circle key={t} cx={b[0]} cy={b[1]} r={1.7} fill={GOLD} stroke={INK} strokeWidth={0.6} />;
          })}
          {belt("#3a1d0d")}
          <circle cx={p.N[0]} cy={p.N[1] - 1} r={8} fill="#fbf7ee" stroke={INK} strokeWidth={1.6} strokeDasharray="3 1.4" />
        </>
      );
    }
    case "opus": {
      const c = at(0.35, 0);
      const pa = at(0.02, 15);
      const pb = at(0.02, -15);
      return (
        <>
          {belt(GOLD)}
          <path
            d={`M${c[0]} ${c[1] - 5} L${c[0] + 1.6} ${c[1] - 1.6} L${c[0] + 5} ${c[1]} L${c[0] + 1.6} ${c[1] + 1.6} L${c[0]} ${c[1] + 5} L${c[0] - 1.6} ${c[1] + 1.6} L${c[0] - 5} ${c[1]} L${c[0] - 1.6} ${c[1] - 1.6} Z`}
            fill={CLAN} stroke={INK} strokeWidth={0.8}
          />
          <ellipse cx={pa[0]} cy={pa[1]} rx={9} ry={6.5} fill={GOLD} stroke={INK} strokeWidth={1.6} />
          <ellipse cx={pb[0]} cy={pb[1]} rx={9} ry={6.5} fill={GOLD} stroke={INK} strokeWidth={1.6} />
        </>
      );
    }
    case "jev": {
      const a = at(0.1, 5);
      const b = at(0.85, 5);
      const c = at(0.4, -3);
      return (
        <>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#5dff7a" strokeWidth={1.4} />
          <text x={c[0] - 3} y={c[1] + 3} fontSize={8} fill="#5dff7a">%</text>
          {belt("#2a2e38")}
        </>
      );
    }
  }
}

function ShinExtras({ who, k, f, flame = ["#ff8a00", "#ffd23f"] }: { who: Combatant; k: Pt; f: Pt; flame?: [string, string] }) {
  if (who === "player") {
    const a = lerp(k, f, 0.55);
    const b = lerp(k, f, 0.85);
    return (
      <>
        <path d={`M${a[0] - 4} ${a[1] + 4} q 3 -9 6 -14 q 1 7 4 10 z`} fill={flame[0]} />
        <path d={`M${b[0] - 5} ${b[1] + 2} q 4 -8 5 -12 q 2 6 5 9 z`} fill={flame[1]} />
      </>
    );
  }
  if (who === "jev") {
    return <line x1={k[0]} y1={k[1]} x2={f[0]} y2={f[1]} stroke="#5dff7a" strokeWidth={1.2} />;
  }
  return null;
}

// ---------------------------------------------------------------- sprite

export function FighterSprite({
  who,
  facing = "right",
  height = 200,
  still,
  portrait = false,
  pose: livePose,
  victory = false,
  costume = "crimson",
  className,
  style,
}: {
  who: Combatant;
  facing?: "left" | "right";
  height?: number;
  still?: PoseName;
  portrait?: boolean;
  pose?: Pose; // drive the skeleton directly (real-time game loop)
  victory?: boolean; // loop this fighter's victory celebration (takes precedence over `still`)
  costume?: CostumeId; // the challenger's outfit
  className?: string;
  style?: React.CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const outfit = who === "player" ? (COSTUME_LOOK[costume] ?? COSTUME_LOOK.crimson) : null;
  const look: Look = outfit ? { ...LOOKS.player, ...outfit } : LOOKS[who];
  const p = useFighterPose(
    livePose ?? (portrait ? POSES.idle : still && !victory ? POSES[still] : undefined),
    victory ? who : undefined,
  );

  const dir = norm(sub(p.P, p.N));
  const perp: Pt = [-dir[1], dir[0]];
  const S = lerp(p.N, p.P, 0.1); // shoulders
  const torso = [add(p.N, mul(perp, 17)), add(p.N, mul(perp, -17)), add(p.P, mul(perp, -12.5)), add(p.P, mul(perp, 12.5))]
    .map((q) => q.join(" "))
    .join(" L ");
  const headAngle = deg(sub(p.H, p.N)) + 90;
  const sleeve = look.sleeveW ?? 12.5;
  const name = who === "player" ? PLAYER.name : FIGHTERS[who].name;

  // Scale around the feet so taller fighters still stand on the floor.
  const sc = look.scale;
  const body = `translate(95 205) scale(${sc}) translate(-95 -205)`;
  const headPos: Pt = [95 + (POSES.idle.H[0] - 95) * sc, 205 + (POSES.idle.H[1] - 205) * sc];
  const viewBox = portrait ? `${headPos[0] - 21} ${headPos[1] - 24} 42 42` : "10 10 180 200";
  const width = portrait ? height : (height * 180) / 200;
  const air = Math.max(0, 204 - Math.max(p.fB[1], p.fF[1], p.hB[1], p.hF[1], p.H[1]));

  return (
    <svg
      role="img"
      aria-label={name}
      className={className}
      width={width}
      height={height}
      viewBox={viewBox}
      style={{ transform: facing === "left" ? "scaleX(-1)" : undefined, overflow: "visible", ...style }}
    >
      <defs>
        <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {!portrait && <ellipse cx={p.P[0]} cy={207} rx={34 * Math.max(0.45, 1 - air / 70)} ry={5} fill="rgba(0,0,0,.4)" />}
      <g transform={body}>
        <BackLayer who={who} p={p} />
        {/* back arm */}
        <Bone a={S} b={p.eB} w={sleeve} color={look.upperArm} shade />
        <Bone a={p.eB} b={p.hB} w={10.5} color={look.forearm} shade />
        <Hand at={p.hB} color={look.hand} shade />
        {/* legs */}
        <Bone a={p.P} b={p.kB} w={16.5} color={look.thigh} shade />
        <Bone a={p.kB} b={p.fB} w={13.5} color={look.shin} shade />
        <ShinExtras who={who} k={p.kB} f={p.fB} flame={outfit?.flame} />
        <Foot knee={p.kB} foot={p.fB} color={look.foot} shade />
        <Bone a={p.P} b={p.kF} w={16.5} color={look.thigh} />
        <Bone a={p.kF} b={p.fF} w={13.5} color={look.shin} />
        <ShinExtras who={who} k={p.kF} f={p.fF} flame={outfit?.flame} />
        <Foot knee={p.kF} foot={p.fF} color={look.foot} />
        {/* torso */}
        <path d={`M ${torso} Z`} fill={look.top} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path
          d={`M ${add(p.N, mul(perp, 9)).join(" ")} L ${add(p.P, mul(perp, 6)).join(" ")}`}
          stroke="rgba(255,255,255,.16)" strokeWidth={4} strokeLinecap="round"
        />
        <TorsoDetails who={who} p={p} perp={perp} />
        {/* neck + head */}
        <Bone a={p.N} b={lerp(p.N, p.H, 0.6)} w={10} color={look.skin} />
        <g transform={`translate(${p.H[0]} ${p.H[1]}) rotate(${headAngle}) scale(1.12)`}>
          <Head who={who} look={look} glowId={`glow-${uid}`} band={outfit?.band} flash={p.glow} />
        </g>
        {/* front arm */}
        <Bone a={S} b={p.eF} w={sleeve} color={look.upperArm} />
        <Bone a={p.eF} b={p.hF} w={10.5} color={look.forearm} />
        <Hand at={p.hF} color={look.hand} r={7.6} />
        {who === "jev" && <circle cx={p.hF[0] + 2} cy={p.hF[1] - 1} r={1.6} fill="#5dff7a" />}
      </g>
    </svg>
  );
}
