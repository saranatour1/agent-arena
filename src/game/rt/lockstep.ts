// Online PvP by lockstep: the engine is deterministic, so both browsers run the
// same fight and only swap inputs, one character per frame. Each input is
// scheduled INPUT_DELAY frames ahead to hide network latency; a browser only
// steps a frame once it has both players' inputs for it. The server replays the
// same strings to decide the winner, so results can't be faked.
import { NO_INPUT, newWorld, step, type Attack, type Input, type World } from "./engine";

export const INPUT_DELAY = 8; // frames (~133ms)
export const MAX_FRAMES = 20_000; // ~5.5 min of inputs: far past any single-round match

const ATTACKS: (Attack | null)[] = [null, "punch", "kick", "special"];

export const encode = (i: Input) =>
  String.fromCharCode(97 + (i.dir + 1) + 3 * (i.block ? 1 : 0) + 6 * ATTACKS.indexOf(i.attack));

export function decode(c: string): Input {
  const n = c.charCodeAt(0) - 97;
  return { dir: ((n % 3) - 1) as Input["dir"], block: Math.floor(n / 3) % 2 === 1, attack: ATTACKS[Math.floor(n / 6)] };
}

export const isInputs = (s: string) => /^[a-x]*$/.test(s);

// Both players start with INPUT_DELAY idle frames, so frame 0 can run at once.
export const OPENING = encode(NO_INPUT).repeat(INPUT_DELAY);

// Replays a match from both input strings; stops at the decided winner or when
// either string runs out. `frames` is how far it got.
export function replay(a: string, b: string, roundsToWin: number): { w: World; frames: number } {
  const w = newWorld(roundsToWin);
  const n = Math.min(a.length, b.length);
  let f = 0;
  for (; f < n && w.winner === null; f++) step(w, [decode(a[f]), decode(b[f])]);
  return { w, frames: f };
}
