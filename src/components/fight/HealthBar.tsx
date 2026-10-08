import { memo } from "react";
import { MAX_HP } from "../../game/rt/engine";
import { FighterSprite, type Combatant } from "../FighterSprite";
import type { CostumeId } from "../../../convex/game/progress";

// Framed arcade health bar with portrait. The red "damage trail" drains after
// the yellow bar so every hit is easy to read.
export const HealthBar = memo(function HealthBar({
  hp,
  name,
  who,
  costume,
  side,
  wins,
}: {
  hp: number;
  name: string;
  who?: Combatant;
  costume?: CostumeId;
  side: "left" | "right";
  wins: number;
}) {
  const pct = Math.max(0, Math.min(100, (hp / MAX_HP) * 100));
  const right = side === "right";
  const low = pct <= 25;
  return (
    <div className={`flex min-w-0 flex-1 items-start gap-2 ${right ? "flex-row-reverse" : ""}`}>
      {who && (
        <div className="hud-portrait shrink-0">
          <FighterSprite who={who} portrait height={52} facing={right ? "left" : "right"} costume={costume} />
        </div>
      )}
      <div className={`min-w-0 flex-1 ${right ? "text-right" : ""}`}>
        <div
          className="hud-bar relative h-5 sm:h-6"
          role="meter"
          aria-label={`${name} health`}
          aria-valuemin={0}
          aria-valuemax={MAX_HP}
          aria-valuenow={hp}
        >
          <div
            className={`absolute inset-y-0 bg-[#e0262f] transition-[width] delay-300 duration-700 ${right ? "right-0" : "left-0"}`}
            style={{ width: `${pct}%` }}
          />
          <div
            data-testid={`hp-${side}`}
            className={`absolute inset-y-0 transition-[width] duration-150 ${right ? "right-0" : "left-0"} ${low ? "hud-fill-low" : "hud-fill"}`}
            style={{ width: `${pct}%` }}
          />
          <div className="absolute inset-x-0 top-0 h-[35%] bg-white/30" />
        </div>
        <div className={`mt-1 flex items-center gap-2 ${right ? "flex-row-reverse" : ""}`}>
          <span className="font-display text-outline-thin truncate text-lg tracking-wide sm:text-2xl">{name}</span>
          {[0, 1].map((i) => (
            <span
              key={i}
              aria-hidden
              className={`inline-block size-3.5 rotate-45 border-2 border-black ${i < wins ? "bg-gold shadow-[0_0_8px_#ffd23f]" : "bg-black/50"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
