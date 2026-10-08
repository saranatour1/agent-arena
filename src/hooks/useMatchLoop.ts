import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { ROUNDS_TO_WIN, summonerSide } from "../../convex/game/fighters";
import type { Combatant } from "../components/FighterSprite";
import { FPS, MATCH_END_FRAMES, newWorld, situation, step, type Input, type Recent, type World } from "../game/rt/engine";
import { Brain, SKILL } from "../game/rt/brain";
import { newPad, useKeyboard, type PadState } from "../game/rt/pad";
import { createFightFx, readPad, useArenaScale, type FxState } from "./fightFx";

const FRAME_MS = 1000 / FPS;
const MAX_FRAME_MS = 50; // longer gaps (background tab) are dropped, not fast-forwarded
const RECENT_LEN = 8;
const REPORT_RETRY_MS = 2000;

const isRecent = (act: string): act is Recent => act === "punch" || act === "kick" || act === "special" || act === "block";

// Runs one live match: fixed-step simulation at 60fps, AI plan prefetching,
// sound/effects from game events, and reporting the result to the server.
export function useMatchLoop(match: Doc<"matches">, sides: Combatant[], names: [string, string]) {
  const playerSide = sides.indexOf("player");
  const planMoves = useAction(api.ai.planMoves);
  const reportMatch = useMutation(api.game.reportMatch);

  const [w] = useState<World>(() => newWorld(ROUNDS_TO_WIN, summonerSide(sides)));
  const [brains] = useState(() => sides.map((c) => (c === "player" ? null : new Brain(SKILL[c]))));
  const [pad] = useState<PadState>(newPad);
  const [fx] = useState<FxState>(() => ({ list: [], nextId: 0 }));
  const [summoned, setSummoned] = useState(false);
  const [, setTick] = useState(0);
  const [startedAt] = useState(() => performance.now());
  const arenaRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  useKeyboard(pad, playerSide >= 0);
  useArenaScale(arenaRef);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let reportState: "idle" | "sending" | "done" = "idle";
    let retryReportAt = 0;
    const retryPlanAt = [0, 0];
    const recent: [Recent[], Recent[]] = [[], []];
    const { onEvents, announcePhase } = createFightFx({
      w,
      fx,
      sides,
      names,
      playerSide,
      shakeRef,
      onRoundStart: () => brains.forEach((b) => b?.reset()),
      onSummon: () => setSummoned(true),
    });

    const requestPlan = (i: 0 | 1) => {
      const brain = brains[i];
      if (!brain || w.frame < retryPlanAt[i] || w.phase === "roundEnd" || w.phase === "matchEnd") return;
      if (!brain.wantsPlan(performance.now())) return;
      brain.pending = true;
      planMoves({ matchId: match._id, side: i, situation: situation(w, i, recent) })
        .then((plan) => brain.receive(plan, w.frame))
        .catch(() => {
          brain.pending = false;
          retryPlanAt[i] = w.frame + FPS; // fallback moves cover the gap
        });
    };

    const report = (now: number) => {
      if (reportState !== "idle" || now < retryReportAt || w.winner === null) return;
      reportState = "sending";
      reportMatch({
        matchId: match._id,
        winner: w.winner,
        roundWins: [...w.roundWins],
        hp: w.f.map((f) => Math.round(f.hp)),
        perfectRounds: playerSide >= 0 ? w.flawlessRounds[playerSide] : 0,
        durationMs: Math.round(now - startedAt),
        summoned: w.summoned,
      }).then(
        () => (reportState = "done"),
        () => {
          reportState = "idle";
          retryReportAt = performance.now() + REPORT_RETRY_MS;
        },
      );
    };

    const frame = (now: number) => {
      acc += Math.min(MAX_FRAME_MS, now - last);
      last = now;
      while (acc >= FRAME_MS) {
        acc -= FRAME_MS;
        const inputs: [Input, Input] = [
          brains[0] ? brains[0].input(w, 0) : readPad(pad),
          brains[1] ? brains[1].input(w, 1) : readPad(pad),
        ];
        const before = [w.f[0].act, w.f[1].act];
        const phaseBefore = w.phase;
        onEvents(step(w, inputs));
        for (const i of [0, 1] as const) {
          const act = w.f[i].act;
          if (act === before[i]) continue;
          if (i === playerSide && act === pad.queued) pad.queued = null; // the press came out
          if (isRecent(act)) {
            recent[i].push(act);
            if (recent[i].length > RECENT_LEN) recent[i].shift();
          }
        }
        if (w.phase !== phaseBefore) announcePhase();
        requestPlan(0);
        requestPlan(1);
      }
      if (w.phase === "matchEnd" && w.phaseT >= MATCH_END_FRAMES) report(now);
      setTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [w, brains, pad, fx, planMoves, reportMatch, match._id, playerSide, sides, names, startedAt]);

  return { w, brains, pad, fx, summoned, playerSide, arenaRef, shakeRef };
}
