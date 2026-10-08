import { Lock } from "lucide-react";
import { ACHIEVEMENTS, ACHIEVEMENT_IDS } from "../../../convex/game/progress";

export function Achievements({ unlocked }: { unlocked: string[] }) {
  const have = new Set(unlocked);
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {have.size} / {ACHIEVEMENT_IDS.length} unlocked
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {ACHIEVEMENT_IDS.map((id) => {
          const a = ACHIEVEMENTS[id];
          const on = have.has(id);
          return (
            <div
              key={id}
              className={`flex items-start gap-2 rounded-lg border p-2 ${on ? "border-accent/50 bg-accent/10" : "border-border opacity-70"}`}
            >
              <span className={`text-2xl leading-none ${on ? "" : "grayscale"}`} aria-hidden>
                {a.icon}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  {a.name} {!on && <Lock className="size-3" aria-label="locked" />}
                </p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
