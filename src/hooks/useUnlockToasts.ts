import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ACHIEVEMENTS, type AchievementId } from "../../convex/game/progress";
import type { Profile } from "../game/profile";
import { sfx } from "../game/sfx";

// Pops a toast whenever an achievement unlocks or the player levels up.
export function useUnlockToasts(profile: Profile | null | undefined) {
  const seen = useRef<{ ach: Set<string>; level: number } | null>(null);
  useEffect(() => {
    if (!profile) return;
    const prev = seen.current;
    seen.current = { ach: new Set(profile.achievements), level: profile.level };
    if (!prev) return; // first load: don't replay old unlocks
    for (const id of profile.achievements) {
      if (prev.ach.has(id)) continue;
      const a = ACHIEVEMENTS[id as AchievementId];
      if (a) {
        sfx.unlock();
        toast(`${a.icon} ACHIEVEMENT UNLOCKED`, { description: `${a.name} — ${a.desc}` });
      }
    }
    if (profile.level > prev.level) {
      sfx.levelUp();
      toast.success(`LEVEL UP! You're level ${profile.level}`, { description: `New title: ${profile.title}` });
    }
  }, [profile]);
}
