import { useEffect, useState } from "react";
import type { Combatant } from "../components/FighterSprite";
import { POSES, lerpPose, type Pose } from "../game/poses";
import { FPS } from "../game/rt/engine";
import { victoryPose, victoryStill } from "../game/rt/pose";

const BREATH_MS = 1400;
const FRAME_MS = 1000 / 30;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Idle breathing for fighters shown outside a fight (title, lobby), or a
// champion's looping victory routine. A fixed `still` pose (portraits, live
// game frames) skips the loop; reduced motion holds the signature pose.
export function useFighterPose(still?: Pose, celebrate?: Combatant): Pose {
  const [pose, setPose] = useState<Pose>(() =>
    celebrate ? (reducedMotion() ? victoryStill(celebrate) : victoryPose(celebrate, 0, true)) : POSES.idle,
  );
  const animate = !still;

  useEffect(() => {
    if (!animate || reducedMotion()) return;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - last >= FRAME_MS) {
        last = now;
        const ms = now - start;
        setPose(
          celebrate
            ? victoryPose(celebrate, (ms / 1000) * FPS, true)
            : lerpPose(POSES.idle, POSES.idleLow, (1 - Math.cos((ms / BREATH_MS) * 2 * Math.PI)) / 2),
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, celebrate]);

  return still ?? pose;
}
