import { useEffect, type RefObject } from "react";
import { FIGHTERS, PLAYER } from "../../convex/game/fighters";
import type { Combatant } from "../components/FighterSprite";
import { isFinalRound, type GameEvent, type Input, type World } from "../game/rt/engine";
import { HIT_HEIGHT, type Fx } from "../game/rt/fx";
import { BUFFER_MS, type PadState } from "../game/rt/pad";
import { say, sfx } from "../game/sfx";

// What every fight (vs AI, vs a person, vs the practice bot) shares: sparks,
// sounds and announcer calls from engine events, arena scaling, pad reading.

export const colorOf = (c: Combatant) => (c === "player" ? PLAYER.color : FIGHTERS[c].color);
const specialOf = (c: Combatant) => (c === "player" ? PLAYER.special : FIGHTERS[c].special);

export type FxState = { list: Fx[]; nextId: number };

// Sprite units per px follow the arena width so hits line up at any size.
export function useArenaScale(arenaRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      el.style.setProperty("--s", String(Math.min(2, Math.max(0.45, el.clientWidth / 615))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [arenaRef]);
}

export function readPad(pad: PadState): Input {
  if (pad.queued && performance.now() - pad.queuedAt > BUFFER_MS) pad.queued = null;
  return { dir: pad.left === pad.right ? 0 : pad.left ? -1 : 1, block: pad.block, attack: pad.queued };
}

export function createFightFx({
  w,
  fx,
  sides,
  names,
  playerSide,
  shakeRef,
  onRoundStart,
  onSummon,
}: {
  w: World;
  fx: FxState;
  sides: Combatant[];
  names: [string, string];
  playerSide: number;
  shakeRef: RefObject<HTMLDivElement | null>;
  onRoundStart?: () => void;
  onSummon?: () => void;
}) {
  const shake = () =>
    shakeRef.current?.animate(
      [{ transform: "translate(0,0)" }, { transform: "translate(-7px,4px)" }, { transform: "translate(6px,-4px)" }, { transform: "translate(0,0)" }],
      { duration: 320 },
    );

  const onEvents = (events: GameEvent[]) => {
    for (const e of events) {
      const id = ++fx.nextId;
      switch (e.type) {
        case "hit":
        case "block": {
          if (e.type === "block") sfx.block();
          else (e.attack === "special" ? sfx.blast : e.attack === "kick" ? sfx.kick : sfx.punch)();
          if (e.type === "hit" && e.attack === "special") shake();
          const atk = 1 - e.target;
          fx.list.push({
            id,
            kind: "spark",
            x: w.f[e.target].x + (atk === 0 ? -14 : 14),
            h: HIT_HEIGHT[e.attack],
            size: e.type === "hit" ? 60 + e.damage * 5 : 55,
            color: e.attack === "special" ? colorOf(sides[atk]) : "#ff8a00",
            blocked: e.type === "block",
            until: w.frame + 26,
          });
          if (e.type === "hit" && e.damage > 0) {
            fx.list.push({ id: id + 0.5, kind: "dmg", x: w.f[e.target].x, amount: e.damage, until: w.frame + 50 });
          }
          break;
        }
        case "launch":
          fx.list.push({
            id,
            kind: "callout",
            side: e.owner,
            text: `${specialOf(sides[e.owner])}!`,
            color: colorOf(sides[e.owner]),
            until: w.frame + 80,
          });
          break;
        case "summon":
          sfx.summon();
          say("Plot twist!");
          onSummon?.();
          fx.list.push({
            id,
            kind: "callout",
            side: e.owner,
            text: `PLOT TWIST! ${e.count} HAIKU SUB-AGENTS!`,
            color: FIGHTERS.haiku.color,
            until: w.frame + 150,
          });
          break;
        case "ko":
          sfx.ko();
          shake();
          break;
        case "roundStart":
          onRoundStart?.();
          say(isFinalRound(w) ? "Final round" : `Round ${w.round}`);
          break;
        case "fight":
          say("Fight!");
          break;
        case "finish":
          say("Finish it!");
          break;
      }
    }
    if (events.length || fx.list.some((f) => f.until <= w.frame)) {
      fx.list = fx.list.filter((f) => f.until > w.frame);
    }
  };

  const announcePhase = () => {
    if (w.phase === "roundEnd") {
      if (w.roundWinner === null) say("Draw!");
      else say(w.roundEndReason === "time" ? "Time!" : w.f[w.roundWinner].flawless ? "Perfect!" : "K.O.!");
    } else if (w.phase === "matchEnd" && w.winner !== null) {
      say(playerSide >= 0 ? (w.winner === playerSide ? "You win!" : "You lose.") : `${names[w.winner]} wins!`);
    }
  };

  return { onEvents, announcePhase };
}
