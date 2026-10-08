import { useEffect } from "react";
import type { Attack } from "./engine";

// Live controller state the game loop reads every frame.
export type PadState = {
  left: boolean;
  right: boolean;
  block: boolean;
  queued: Attack | null; // pressed attack, consumed once the fighter starts it
  queuedAt: number;
};
export const newPad = (): PadState => ({ left: false, right: false, block: false, queued: null, queuedAt: 0 });

// A press survives this long, so an attack pressed during hit-stun still comes out.
export const BUFFER_MS = 130;
export function press(pad: PadState, attack: Attack) {
  pad.queued = attack;
  pad.queuedAt = performance.now();
}

// One source of truth for the controls (keyboard handling + help text).
// `hint` is the key shown on the on-screen pad.
export const CONTROLS = [
  { keys: "← →", hint: "←→", label: "Move", detail: "Walk toward or away" },
  { keys: "E / 1", hint: "E", label: "Punch", detail: "Fast, short range" },
  { keys: "R / 2", hint: "R", label: "Kick", detail: "Slower, longer, harder" },
  { keys: "C / 3", hint: "C", label: "Block", detail: "Hold to guard (↓ works too)" },
  { keys: "F / 4", hint: "F", label: "Special", detail: "Energy blast when POWER is full" },
] as const;

// E R C F (or 1 2 3 4) under the left hand, arrows under the right. The old
// J K L / A S D layout still works.
const KEYS: Record<string, "left" | "right" | "block" | Attack> = {
  ArrowLeft: "left",
  a: "left",
  ArrowRight: "right",
  d: "right",
  e: "punch",
  "1": "punch",
  j: "punch",
  r: "kick",
  "2": "kick",
  k: "kick",
  c: "block",
  "3": "block",
  ArrowDown: "block",
  s: "block",
  f: "special",
  "4": "special",
  l: "special",
};

export function useKeyboard(pad: PadState, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const set = (e: KeyboardEvent, down: boolean) => {
      if (down && (e.metaKey || e.ctrlKey || e.altKey)) return; // leave ⌘R, ⌘C, ⌘F to the browser
      const k = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (!k) return;
      e.preventDefault();
      if (k === "punch" || k === "kick" || k === "special") {
        if (down && !e.repeat) press(pad, k);
      } else if (k === "left" || k === "right" || k === "block") {
        pad[k] = down;
      }
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const blur = () => Object.assign(pad, newPad());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [pad, enabled]);
}

