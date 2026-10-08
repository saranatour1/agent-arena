import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIGHTERS, type FighterId } from "../../convex/game/fighters";
import { FighterSprite, type Combatant } from "../components/FighterSprite";
import type { PoseName } from "../game/poses";
import { blip, sfx } from "../game/sfx";

// The first-run intro, "I'm Not Dead, You're Dead": a two-page comic read one
// panel at a time. Panels reveal on their own; click or Enter skips ahead.

// A figure in a panel. x: center, % of panel width. y: feet, % of panel height
// from the bottom (negative for close-ups). h: sprite height, % of panel height.
type Figure = { who: Combatant; x: number; y: number; h: number; facing?: "left" | "right"; pose?: PoseName; silhouette?: boolean };
// x: center, y: top, both % of the panel; size: % of panel height.
type Lettering = { text: string; x: number; y: number; color: string; size: number; tilt?: number; stack?: boolean };
type Panel = {
  strip: number; // panels sharing a strip show together, one or two at a time
  grow: number; // share of the strip's width
  bg: keyof typeof BACKGROUNDS;
  tone?: boolean;
  focus?: { x: number; y: number; ink: string }; // manga focus lines
  cast: Figure[];
  narration?: string;
  say?: { who: FighterId; text: string; x: number; y: number; w: number; kind?: "say" | "shout" | "whisper"; tail?: "left" | "right" | "down" };
  fx?: Lettering[];
  impact?: boolean;
  hold?: number;
  tilt?: number;
};

const BACKGROUNDS = {
  warm: "linear-gradient(170deg, #fff6d8, #f4d995)",
  cool: "linear-gradient(170deg, #eef3fa, #b9c8de)",
  dusk: "linear-gradient(170deg, #4a3566, #160d22)",
  hot: "radial-gradient(circle at 35% 55%, #fff1c9, #ff9a3c 55%, #c2182b)",
};

// Close-up helper: put a fighter's face at (x, faceY) at the given sprite height.
const face = (who: FighterId, x: number, faceY: number, h: number, facing: "left" | "right", pose?: PoseName): Figure => ({
  who,
  x,
  y: faceY - h * (who === "opus" ? 0.87 : 0.78),
  h,
  facing,
  pose,
});

const PANELS: Panel[] = [
  {
    strip: 0,
    grow: 4,
    bg: "warm",
    narration: "Somewhere outside the Arena…",
    cast: [{ who: "haiku", x: 52, y: 8, h: 78, facing: "right", pose: "walkA" }],
    fx: [{ text: "TAP TAP", x: 24, y: 66, color: "#1785a6", size: 10, tilt: -4 }],
    hold: 1500,
  },
  {
    strip: 0,
    grow: 2,
    bg: "warm",
    cast: [
      { who: "player", x: 12, y: 14, h: 62, facing: "right", silhouette: true },
      { who: "sonnet", x: 36, y: 6, h: 74, facing: "right" },
      { who: "jev", x: 68, y: 6, h: 74, facing: "left" },
      { who: "player", x: 92, y: 14, h: 62, facing: "left", silhouette: true },
    ],
    fx: [{ text: "ZAWA ZAWA", x: 50, y: 5, color: "#6b3a1e", size: 11, tilt: -6 }],
    hold: 1400,
  },
  {
    strip: 1,
    grow: 6,
    bg: "dusk",
    tone: true,
    focus: { x: 64, y: 55, ink: "rgba(255,255,255,.35)" },
    cast: [
      { who: "haiku", x: 16, y: 8, h: 58, facing: "right" },
      { who: "opus", x: 64, y: 4, h: 96, facing: "left" },
    ],
    fx: [
      { text: "GOGOGOGO", x: 84, y: 6, color: "#b77dff", size: 13, stack: true },
      { text: "DON!", x: 40, y: 18, color: "#ffd23f", size: 26, tilt: -10 },
    ],
    impact: true,
    hold: 1500,
  },
  {
    strip: 2,
    grow: 2,
    bg: "cool",
    tone: true,
    cast: [face("opus", 56, 40, 220, "left")],
    say: { who: "opus", text: "Haiku… you're still alive? I thought you were dead.", x: 6, y: 5, w: 88 },
  },
  {
    strip: 2,
    grow: 4,
    bg: "warm",
    cast: [face("haiku", 26, 44, 240, "right")],
    say: {
      who: "haiku",
      text: "People still liked me, even if I wasn't good enough. I'm cheap and great, so my creators got me back up on my feet.",
      x: 47,
      y: 8,
      w: 50,
      tail: "left",
    },
    fx: [{ text: "!", x: 8, y: 8, color: "#1785a6", size: 16 }],
  },
  {
    strip: 3,
    grow: 6,
    bg: "warm",
    cast: [{ who: "haiku", x: 14, y: 10, h: 60, facing: "right" }, face("sonnet", 66, 50, 175, "left")],
    say: { who: "sonnet", text: "Nah. You're still dead to most people.", x: 24, y: 10, w: 34, tail: "right" },
    fx: [{ text: "HEH", x: 90, y: 8, color: "#b8461a", size: 12, tilt: 8 }],
  },
  {
    strip: 4,
    grow: 3,
    bg: "warm",
    cast: [face("jev", 68, 46, 190, "left")],
    say: { who: "jev", text: "I'm 99% sure you were dead.", x: 4, y: 8, w: 52, tail: "right" },
  },
  {
    strip: 4,
    grow: 3,
    bg: "cool",
    tone: true,
    cast: [face("jev", 32, 40, 420, "left")],
    say: { who: "jev", text: "{....}", x: 56, y: 12, w: 40, kind: "whisper", tail: "left" },
    hold: 1700,
  },
  {
    strip: 5,
    grow: 6,
    bg: "hot",
    focus: { x: 34, y: 50, ink: "rgba(0,0,0,.4)" },
    cast: [face("haiku", 30, 52, 200, "right", "win")],
    say: {
      who: "haiku",
      text: "I'm not dead, you're ALL dead!! Let's take this to the Arena!",
      x: 52,
      y: 10,
      w: 44,
      kind: "shout",
      tail: "left",
    },
    fx: [
      { text: "DODODODO", x: 6, y: 6, color: "#1785a6", size: 12, stack: true },
      { text: "DON!", x: 78, y: 62, color: "#ffd23f", size: 24, tilt: -8 },
    ],
    impact: true,
    tilt: -1.2,
  },
];

const TYPE_MS = 26;
const HOLD_MS = 1300;
const HOLD_PER_CHAR = 28;
// Typing blip pitch per speaker: Haiku chirps, Opus rumbles.
const VOICE_PITCH: Record<FighterId, number> = { haiku: 1.5, jev: 1.25, sonnet: 1.05, opus: 0.65 };

export function Intro({ onDone, onStart }: { onDone: () => void; onStart?: () => void }) {
  const [reduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [shownCount, setShownCount] = useState(1); // panels revealed so far
  const [typed, setTyped] = useState(0);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const finale = shownCount > PANELS.length;
  const current = PANELS[Math.min(shownCount, PANELS.length) - 1];
  const len = finale ? 0 : (current.say?.text.length ?? 0);
  const shown = reduced ? len : typed;
  const strip = current.strip;

  const next = useCallback(() => {
    setShownCount((n) => Math.min(n + 1, PANELS.length + 1));
    setTyped(0);
  }, []);

  useEffect(() => {
    if (finale) return;
    if (shown < len) {
      const t = setTimeout(() => {
        if (shown % 2 === 0 && current.say!.text[shown].trim()) blip(VOICE_PITCH[current.say!.who]);
        setTyped((n) => n + 1);
      }, TYPE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(next, current.hold ?? HOLD_MS + len * HOLD_PER_CHAR);
    return () => clearTimeout(t);
  }, [finale, current, shown, len, next]);

  useEffect(() => {
    if (finale) {
      sfx.blast();
      return;
    }
    if (!current.impact) return;
    sfx.ko();
    if (reduced) return;
    panelRefs.current[shownCount - 1]?.animate(
      [{ transform: "translate(0,0)" }, { transform: "translate(-6px,4px)" }, { transform: "translate(5px,-4px)" }, { transform: "translate(0,0)" }],
      { duration: 340 },
    );
  }, [finale, current, shownCount, reduced]);

  const advance = () => {
    if (finale) return;
    sfx.click();
    if (shown < len) setTyped(len);
    else next();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      else if (!finale && (e.key === "Enter" || e.key === " " || e.key === "ArrowRight")) {
        e.preventDefault();
        advance(); // the finale waits for a deliberate click, so mashing Enter can't spend a heart
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <main className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-black/75 p-3 select-none sm:p-6" onClick={advance}>
      <div
        key={strip}
        className="flex h-[70dvh] w-[min(94vw,1150px)] flex-col gap-3 rounded-sm bg-[#fffdf6] p-3 shadow-2xl sm:h-[min(41vw,64dvh)] sm:flex-row"
      >
        {PANELS.map((panel, n) =>
          panel.strip !== strip ? null : (
            <div
              key={n}
              ref={(el) => {
                panelRefs.current[n] = el;
              }}
              className={`relative min-h-0 min-w-0 ${n < shownCount ? "anim-pop" : "invisible"}`}
              style={{ flexGrow: panel.grow, flexBasis: 0, rotate: panel.tilt ? `${panel.tilt}deg` : undefined }}
            >
              <PanelArt panel={panel} typed={n === shownCount - 1 ? shown : Infinity} />
            </div>
          ),
        )}
      </div>

      {!finale && (
        <div className="absolute right-3 bottom-3 flex items-center gap-3 text-xs text-white/60">
          <span className="hidden sm:inline">Click or press Enter to continue · Esc to skip</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
          >
            Skip
          </Button>
        </div>
      )}

      {finale && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 bg-black/85 px-4 text-center">
          <h1 className="banner-text banner-red anim-banner-stay pb-3 text-6xl leading-[1.05] sm:text-8xl">
            I&rsquo;M NOT DEAD,
            <br />
            YOU&rsquo;RE DEAD
          </h1>
          <p className="max-w-md text-lg text-white/90">Haiku called everyone out. Now it&rsquo;s your turn to step into the Arena.</p>
          <div className="flex flex-wrap items-start justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-1">
              <Button size="lg" className="font-display min-w-48 text-2xl" onClick={onStart ?? onDone}>
                Enter the Arena <ChevronRight />
              </Button>
              {onStart && <span className="text-xs text-white/70">Uses 1 heart</span>}
            </div>
            {onStart && (
              <Button size="lg" variant="ghost" onClick={onDone}>
                Go to lobby
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// One framed panel: flat comic background, optional screentone and focus
// lines, the figures, lettering, and a speech bubble typed out to `typed`.
function PanelArt({ panel, typed }: { panel: Panel; typed: number }) {
  const say = panel.say;
  return (
    <div
      className="absolute inset-0 overflow-hidden border-[3px] border-black"
      style={{ background: BACKGROUNDS[panel.bg], containerType: "size" }}
    >
      {panel.tone && (
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(rgba(0,0,0,.6) 1px, transparent 1.4px)", backgroundSize: "6px 6px" }}
        />
      )}
      {panel.focus && (
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-conic-gradient(from 0deg at ${panel.focus.x}% ${panel.focus.y}%, transparent 0deg 4deg, ${panel.focus.ink} 4deg 5deg)`,
            maskImage: `radial-gradient(circle at ${panel.focus.x}% ${panel.focus.y}%, transparent 20%, black 65%)`,
          }}
        />
      )}

      {panel.cast.map((f, k) => (
        <div key={k} className="absolute -translate-x-1/2" style={{ left: `${f.x}%`, bottom: `${f.y}%` }}>
          <FighterSprite
            who={f.who}
            facing={f.facing}
            still={f.pose}
            style={{ height: `${f.h}cqh`, width: "auto", ...(f.silhouette ? { filter: "brightness(0)", opacity: 0.55 } : {}) }}
          />
        </div>
      ))}

      {panel.narration && (
        <p className="absolute top-[6%] left-[3%] border-2 border-black bg-white px-[1.2cqw] py-[0.6cqh] text-[max(10px,5.5cqh)] font-semibold text-black">
          {panel.narration}
        </p>
      )}

      {panel.fx?.map((fx, k) => <Letters key={k} fx={fx} />)}

      {say && (
        <SpeechBubble
          name={FIGHTERS[say.who].name}
          color={FIGHTERS[say.who].color}
          text={say.text.slice(0, typed)}
          typing={typed < say.text.length}
          kind={say.kind ?? "say"}
          tail={say.tail ?? "down"}
          style={{ left: `${say.x}%`, top: `${say.y}%`, width: `${say.w}%` }}
        />
      )}
    </div>
  );
}

// Hand-lettered sound effects: bouncy, tilted letters like SCRIBBLE or SLAM.
function Letters({ fx }: { fx: Lettering }) {
  const chars = fx.stack ? (fx.text.match(/.{1,2}/g) ?? []) : [...fx.text];
  return (
    <div
      className={`pointer-events-none absolute flex -translate-x-1/2 ${fx.stack ? "flex-col items-start" : "items-end"}`}
      style={{ left: `${fx.x}%`, top: `${fx.y}%`, rotate: `${fx.tilt ?? 0}deg` }}
    >
      {chars.map((c, k) => (
        <span
          key={k}
          className="font-display text-outline-thin inline-block leading-none"
          style={{
            color: fx.color,
            fontSize: `${fx.size}cqh`,
            transform: fx.stack ? `translateX(${k * 0.6}em)` : `translateY(${k % 2 ? -0.12 : 0.06}em) rotate(${k % 2 ? 6 : -5}deg)`,
          }}
        >
          {c === " " ? " " : c}
        </span>
      ))}
    </div>
  );
}

function SpeechBubble({
  name,
  color,
  text,
  typing,
  kind,
  tail,
  style,
}: {
  name: string;
  color: string;
  text: string;
  typing: boolean;
  kind: "say" | "shout" | "whisper";
  tail: "left" | "right" | "down";
  style: React.CSSProperties;
}) {
  const border = kind === "whisper" ? "border-[2px] border-dotted" : kind === "shout" ? "border-[3px]" : "border-2";
  return (
    <div className="absolute" style={style}>
      <span className="font-display text-outline-thin absolute -top-[1.1em] left-[8%] z-10 text-[max(10px,6cqh)]" style={{ color }}>
        {name}
      </span>
      <div
        className={`relative rounded-[50%] border-black bg-white px-[12%] py-[8%] text-center text-black ${border} ${
          kind === "shout" ? "shadow-[4px_4px_0_#e8192c]" : ""
        }`}
      >
        <p
          className={`leading-tight font-semibold uppercase ${kind === "shout" ? "font-display tracking-wide" : "tracking-wide"}`}
          style={{ fontSize: kind === "shout" ? "max(12px, 7.5cqh)" : "max(9px, 5.4cqh)" }}
        >
          {text}
          {typing && <span className="anim-blink">▍</span>}
        </p>
      </div>
      <span
        className={`absolute size-3 rotate-45 border-black bg-white ${kind === "whisper" ? "border-dotted" : ""} ${
          tail === "left"
            ? "top-1/2 -left-[5px] border-b-2 border-l-2"
            : tail === "right"
              ? "top-1/2 -right-[5px] border-t-2 border-r-2"
              : "-bottom-[5px] left-1/2 -translate-x-1/2 border-r-2 border-b-2"
        }`}
      />
    </div>
  );
}
