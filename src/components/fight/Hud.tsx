import { memo } from "react";
import { FPS, METER_MAX, type World } from "../../game/rt/engine";
import type { Brain } from "../../game/rt/brain";
import type { CostumeId } from "../../../convex/game/progress";
import type { Combatant } from "../FighterSprite";
import { HealthBar } from "./HealthBar";

// Health bars, round timer, special meters and each agent's "brain" status.
export function Hud({
  w,
  sides,
  names,
  costumes,
  brains,
  title,
  subtitle,
}: {
  w: World;
  sides: Combatant[];
  names: [string, string];
  costumes: [CostumeId, CostumeId];
  brains: (Brain | null)[];
  title: string;
  subtitle: string;
}) {
  const seconds = Math.ceil(w.timer / FPS);
  return (
    <>
      <div className="flex items-start gap-2 sm:gap-4">
        <HealthBar hp={Math.round(w.f[0].hp)} name={names[0]} who={sides[0]} costume={costumes[0]} side="left" wins={w.roundWins[0]} />
        <div className="flex shrink-0 flex-col items-center">
          <div
            role="timer"
            aria-label={`${seconds} seconds left`}
            className={`font-display text-outline-thin grid size-14 place-items-center rounded-md border-[3px] border-black bg-black/60 text-4xl sm:size-16 sm:text-5xl ${seconds <= 10 ? "text-hp" : "text-gold"}`}
          >
            {seconds}
          </div>
          <span className="mt-1 text-[11px] text-white/85">ROUND {w.round}</span>
        </div>
        <HealthBar hp={Math.round(w.f[1].hp)} name={names[1]} who={sides[1]} costume={costumes[1]} side="right" wins={w.roundWins[1]} />
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-white/90">
        <div className="flex items-center gap-2">
          <Power value={w.f[0].meter} />
          <BrainChip brain={brains[0]} />
        </div>
        <span className="font-display text-outline-thin text-center text-base tracking-wider sm:text-xl">
          {title}
          <span className="block text-[11px] tracking-[0.2em] text-white/80 sm:text-xs">{subtitle}</span>
        </span>
        <div className="flex items-center gap-2">
          <BrainChip brain={brains[1]} />
          <Power value={w.f[1].meter} right />
        </div>
      </div>
    </>
  );
}

// How fast the agent last thought, and how many planned moves it has queued.
function BrainChip({ brain }: { brain: Brain | null }) {
  if (!brain) return null;
  const ms = brain.lastThinkMs;
  const color = !ms ? "#9aa4b8" : ms < 1500 ? "#5dff7a" : ms < 4000 ? "#ffd23f" : "#ff4d2e";
  return (
    <span className="text-outline text-[11px]" style={{ color }} title="Model think time · moves queued">
      {brain.pending ? "◌" : "●"} {ms ? `${(ms / 1000).toFixed(1)}s` : "--"} · {brain.queue.length}Q
    </span>
  );
}

const Power = memo(function Power({ value, right = false }: { value: number; right?: boolean }) {
  const full = value >= METER_MAX;
  return (
    <div
      role="meter"
      aria-label="Special power"
      aria-valuemin={0}
      aria-valuemax={METER_MAX}
      aria-valuenow={Math.floor(value)}
      className={`flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}
    >
      <span className={`text-[11px] ${full ? "anim-blink text-gold" : "text-[#7af0ff]"}`}>{full ? "SPECIAL!" : "PWR"}</span>
      <span className="relative inline-block h-2.5 w-20 -skew-x-12 overflow-hidden border-2 border-black bg-black/50">
        <span
          className={`absolute inset-y-0 ${right ? "right-0" : "left-0"} ${full ? "bg-gold shadow-[0_0_8px_#ffd23f]" : "bg-[#7af0ff]"}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </span>
    </div>
  );
});
