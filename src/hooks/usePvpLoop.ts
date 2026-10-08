import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ROUNDS_TO_WIN, type FighterId } from "../../convex/game/fighters";
import { scriptedPlan } from "../../convex/game/intents";
import type { Combatant } from "../components/FighterSprite";
import { FPS, MATCH_END_FRAMES, newWorld, situation, step, type Input, type World } from "../game/rt/engine";
import { Brain, SKILL } from "../game/rt/brain";
import { OPENING, decode, encode } from "../game/rt/lockstep";
import { newPad, useKeyboard, type PadState } from "../game/rt/pad";
import { createFightFx, readPad, useArenaScale, type FxState } from "./fightFx";

const FRAME_MS = 1000 / FPS;
const MAX_CATCH_UP = 10; // frames run in one burst after a stall
const CLAIM_AFTER_MS = 9_000; // opponent silent this long: ask the server for the win
const RETRY_MS = 1000;
const CLAIM_RETRY_MS = 3000;

export type Opponent =
  | { kind: "net"; matchId: Id<"pvpMatches">; side: 0 | 1 }
  | { kind: "bot"; who: FighterId }; // free practice, no server, scripted moves

// A fight against another person (lockstep over Convex) or the practice bot.
// See src/game/rt/lockstep.ts for the protocol. `opp` must be stable (memoized):
// a new object restarts the fight loop.
export function usePvpLoop(opp: Opponent, sides: Combatant[], names: [string, string]) {
  const mySide = opp.kind === "net" ? opp.side : 0;
  const pushInputs = useMutation(api.pvp.pushInputs);
  const finish = useMutation(api.pvp.finish);
  const claimWin = useMutation(api.pvp.claimWin);
  const theirs = useQuery(api.pvp.opponentInputs, opp.kind === "net" ? { matchId: opp.matchId } : "skip");
  const theirsRef = useRef("");
  useEffect(() => {
    if (theirs) theirsRef.current = theirs.chars;
  }, [theirs]);

  const [w] = useState<World>(() => newWorld(ROUNDS_TO_WIN));
  const [pad] = useState<PadState>(newPad);
  const [fx] = useState<FxState>(() => ({ list: [], nextId: 0 }));
  const [net] = useState(() => ({ waitingSince: null as number | null, waitingMs: 0 }));
  const [, setTick] = useState(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  useKeyboard(pad, true);
  useArenaScale(arenaRef);

  useEffect(() => {
    const online = opp.kind === "net";
    const bot = opp.kind === "bot" ? new Brain(SKILL[opp.who]) : null;
    const botSide = (1 - mySide) as 0 | 1;
    // Our inputs, frame by frame. Online they run INPUT_DELAY frames ahead of the sim.
    let mine = online ? OPENING : "";
    let sent = mine.length;
    let sending = false;
    let sim = 0;
    let ended: "no" | "settling" | "yes" = "no";
    let nextTryAt = 0;
    let nextClaimAt = 0;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const { onEvents, announcePhase } = createFightFx({
      w,
      fx,
      sides,
      names,
      playerSide: mySide,
      shakeRef,
      onRoundStart: () => bot?.reset(),
    });

    const flush = () => {
      if (!online || sending || sent >= mine.length) return;
      sending = true;
      const from = sent;
      pushInputs({ matchId: opp.matchId, from, chars: mine.slice(from, from + 240) }).then(
        (len) => {
          sent = Math.min(len, mine.length);
          sending = false;
        },
        () => (sending = false),
      );
    };

    const settle = (now: number) => {
      if (!online || ended !== "no" || now < nextTryAt) return;
      if (sent < mine.length) return flush(); // the server needs every input we played
      ended = "settling";
      finish({ matchId: opp.matchId }).then(
        (done) => {
          ended = done ? "yes" : "no";
          nextTryAt = performance.now() + RETRY_MS;
        },
        () => {
          ended = "no";
          nextTryAt = performance.now() + RETRY_MS;
        },
      );
    };

    const frame = (now: number) => {
      acc = Math.min(acc + (now - last), MAX_CATCH_UP * FRAME_MS);
      last = now;
      while (acc >= FRAME_MS && w.winner === null) {
        const remote = online ? theirsRef.current : null;
        if (remote !== null && remote.length <= sim) break; // lockstep: wait for their input
        acc -= FRAME_MS;
        mine += encode(readPad(pad));
        const me: Input = decode(mine[sim]);
        const them: Input = remote !== null ? decode(remote[sim]) : bot!.input(w, botSide);
        const before = w.f[mySide].act;
        const phaseBefore = w.phase;
        onEvents(step(w, mySide === 0 ? [me, them] : [them, me]));
        if (w.f[mySide].act !== before && w.f[mySide].act === pad.queued) pad.queued = null; // the press came out
        if (w.phase !== phaseBefore) announcePhase();
        if (bot?.wantsPlan(now)) bot.receive(scriptedPlan(situation(w, botSide, [[], []])), w.frame);
        sim++;
      }
      if (w.winner !== null) {
        while (acc >= FRAME_MS) {
          acc -= FRAME_MS;
          step(w, [{ dir: 0, block: false, attack: null }, { dir: 0, block: false, attack: null }]);
        }
      }
      // Waiting on the opponent: after a while, the server can award the win.
      const stalled = online && w.winner === null && theirsRef.current.length <= sim;
      net.waitingSince = stalled ? (net.waitingSince ?? now) : null;
      net.waitingMs = net.waitingSince === null ? 0 : now - net.waitingSince;
      if (online && net.waitingSince !== null && now - net.waitingSince > CLAIM_AFTER_MS && now >= nextClaimAt) {
        nextClaimAt = now + CLAIM_RETRY_MS;
        void claimWin({ matchId: opp.matchId }).catch(() => {});
      }
      flush(); // one upload in flight at a time batches inputs by round-trip time
      if (w.phase === "matchEnd" && w.phaseT >= MATCH_END_FRAMES) settle(now);
      setTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [w, pad, fx, net, opp, mySide, sides, names, pushInputs, finish, claimWin]);

  return { w, pad, fx, mySide, arenaRef, shakeRef, waitingMs: net.waitingMs };
}
