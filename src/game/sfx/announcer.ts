// The arcade announcer, via the browser's speech synthesis: the most natural
// English voice on offer, with per-line delivery and no pile-ups.
import { isMuted } from "./engine";

const QUALITY: [RegExp, number][] = [
  [/premium|natural|neural/i, 40],
  [/enhanced/i, 30],
  [/siri/i, 25],
  [/google/i, 20],
];
const DEEP = /\b(male|daniel|alex|aaron|arthur|evan|guy|ryan|christopher|eric|davis|tom|oliver|nathan|james)\b/i;
// Novelty and formant-era voices: fun, but they're what makes it sound like a robot.
const NOVELTY =
  /\b(fred|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|kathy|eddy|flo|reed|rocko|sandy|shelley|grandma|grandpa|espeak|compact)\b/i;

function score(v: SpeechSynthesisVoice) {
  if (!/^en([-_]|$)/i.test(v.lang)) return -Infinity;
  let s = QUALITY.find(([re]) => re.test(v.name))?.[1] ?? 0;
  if (NOVELTY.test(v.name)) s -= 100;
  if (DEEP.test(v.name)) s += 6;
  if (/^en[-_](us|gb)/i.test(v.lang)) s += 3;
  if (v.localService) s += 1;
  return s;
}

export function pickVoice(voices: readonly SpeechSynthesisVoice[]) {
  let best: SpeechSynthesisVoice | undefined;
  let top = -1;
  for (const v of voices) {
    const s = score(v);
    if (s > top) [best, top] = [v, s];
  }
  return best;
}

// `cut` lines are time-critical and interrupt; the rest wait their turn.
type Delivery = { rate: number; pitch: number; cut: boolean; text?: string };
const DELIVERY: [RegExp, Delivery][] = [
  [/^fight!?$/i, { rate: 1.2, pitch: 0.8, cut: true }],
  [/^finish (it|him|her)!?$/i, { rate: 0.7, pitch: 0.55, cut: true }],
  [/^perfect!?$/i, { rate: 0.62, pitch: 0.7, cut: true, text: "Per... fect!" }],
  [/^(round \d+|final round)$/i, { rate: 0.85, pitch: 0.65, cut: true }],
  [/^(k\.o\.|time|draw)!?$/i, { rate: 0.8, pitch: 0.6, cut: true }],
];
const PLAIN: Delivery = { rate: 0.95, pitch: 0.75, cut: false };
const STALE_MS = 1500;

let voice: SpeechSynthesisVoice | undefined;
let current: SpeechSynthesisUtterance | null = null;
let queued: { text: string; d: Delivery; at: number } | null = null;

const synth = () =>
  isMuted() || typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined" ? null : speechSynthesis;

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.onvoiceschanged = () => (voice = pickVoice(speechSynthesis.getVoices()));
  voice = pickVoice(speechSynthesis.getVoices());
}

export function say(text: string) {
  const s = synth();
  if (!s) return;
  const d = DELIVERY.find(([re]) => re.test(text))?.[1] ?? PLAIN;
  const line = d.text ?? text;
  if (d.cut || !(s.speaking || s.pending)) {
    queued = null;
    s.cancel();
    speak(s, line, d);
  } else {
    queued = { text: line, d, at: performance.now() };
  }
}

function speak(s: SpeechSynthesis, text: string, d: Delivery) {
  if (!voice) voice = pickVoice(s.getVoices());
  const u = new SpeechSynthesisUtterance(text);
  u.rate = d.rate;
  u.pitch = d.pitch;
  u.volume = 0.6;
  u.lang = voice?.lang ?? "en-US";
  if (voice) u.voice = voice;
  u.onend = u.onerror = () => {
    if (current !== u) return;
    current = null;
    const next = queued;
    queued = null;
    const live = synth();
    if (next && live && performance.now() - next.at < STALE_MS) speak(live, next.text, next.d);
  };
  current = u;
  s.speak(u);
}
