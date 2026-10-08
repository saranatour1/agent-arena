// The shared Web Audio graph: one lazily created context, a glue compressor and
// limiter on the mix, a small generated room, and a reusable noise source.
import { useSyncExternalStore } from "react";

export type Bus = {
  ctx: BaseAudioContext;
  out: GainNode;
  room: AudioNode;
  noise: AudioBuffer;
};

const LEVEL = 0.1;
const MUTE_KEY = "sfxMuted";

let live: AudioContext | null = null;
let bus: Bus | null = null;
let failed = false;

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
})();
const listeners = new Set<() => void>();

export const isMuted = () => muted;

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    // storage unavailable — mute just won't persist
  }
  if (bus) {
    const g = bus.out.gain;
    const now = bus.ctx.currentTime;
    g.cancelScheduledValues(now);
    if (m) g.setTargetAtTime(0, now, 0.02);
    else g.setValueAtTime(LEVEL, now);
  }
  if (m && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  listeners.forEach((l) => l());
}

export function useMuted() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
  );
}

export function createBus(ctx: BaseAudioContext): Bus {
  const out = ctx.createGain();
  out.gain.value = LEVEL;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -14;
  glue.knee.value = 12;
  glue.ratio.value = 4;
  glue.attack.value = 0.004;
  glue.release.value = 0.12;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.5;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;
  out.connect(glue).connect(limiter).connect(ctx.destination);
  const room = ctx.createConvolver();
  room.buffer = roomImpulse(ctx);
  room.connect(out);
  return { ctx, out, room, noise: whiteNoise(ctx) };
}

export function audio(): Bus | null {
  if (muted || failed || typeof window === "undefined" || !window.AudioContext) return null;
  if (!live) {
    try {
      live = new AudioContext();
      bus = createBus(live);
    } catch {
      failed = true;
      void live?.close().catch(() => {});
      live = bus = null;
      return null;
    }
  }
  if (live.state === "suspended") void live.resume();
  return bus;
}

// Compressors fade in from silence, so wake the context on the press, before the click sounds.
if (typeof window !== "undefined") {
  for (const e of ["pointerdown", "keydown"]) window.addEventListener(e, () => audio(), { once: true, capture: true });
}

function whiteNoise(ctx: BaseAudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// A small, slightly dark room: sparse early reflections, then a diffuse tail
// that loses its highs as it fades.
function roomImpulse(ctx: BaseAudioContext, seconds = 0.5) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const ms = ctx.sampleRate / 1000;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = Math.floor(9 * ms); i < len; i++) {
      const x = i / len;
      lp += (Math.random() * 2 - 1 - lp) * (0.7 - 0.55 * x);
      d[i] = lp * (1 - x) ** 3.5 * 0.6;
    }
    for (const [at, amp] of [[11, 0.9], [17, -0.6], [23, 0.5], [31, -0.35], [43, 0.25]]) {
      d[Math.floor((at + c * 2.3) * ms)] += amp;
    }
  }
  return buf;
}

export const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
export const vary = (x: number, amount: number) => x * rnd(1 - amount, 1 + amount);
export const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

// Linear attack, optional hold, exponential fall. Returns when it's silent.
export function envelope(p: AudioParam, t: number, peak: number, attack: number, decay: number, hold = 0) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + attack);
  if (hold > 0) p.setValueAtTime(peak, t + attack + hold);
  p.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
  return t + attack + hold + decay;
}

// Connects a voice to the mix plus `wet` of it into the room; returns the send to clean up.
export function route(b: Bus, node: AudioNode, wet: number): AudioNode[] {
  node.connect(b.out);
  if (wet <= 0) return [];
  const send = b.ctx.createGain();
  send.gain.value = wet;
  node.connect(send).connect(b.room);
  return [send];
}

export function release(sources: AudioScheduledSourceNode[], nodes: AudioNode[]) {
  let left = sources.length;
  const done = () => {
    if (--left > 0) return;
    for (const n of sources) n.disconnect();
    for (const n of nodes) n.disconnect();
  };
  for (const s of sources) s.onended = done;
}

type Tone = {
  from: number;
  to: number;
  dur: number;
  vol: number;
  type?: OscillatorType;
  attack?: number;
  delay?: number;
  detune?: number;
  cutoff?: number;
  wet?: number;
};

export function tone(b: Bus, t: number, o: Tone) {
  const { ctx } = b;
  const start = t + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "square";
  osc.detune.value = o.detune ?? 0;
  osc.frequency.setValueAtTime(o.from, start);
  if (o.to !== o.from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), start + o.dur);
  const g = ctx.createGain();
  const end = envelope(g.gain, start, o.vol, o.attack ?? 0.004, o.dur);
  const nodes: AudioNode[] = [g];
  if (o.cutoff) {
    const f = ctx.createBiquadFilter();
    f.frequency.value = o.cutoff;
    osc.connect(f).connect(g);
    nodes.push(f);
  } else {
    osc.connect(g);
  }
  nodes.push(...route(b, g, o.wet ?? 0));
  release([osc], nodes);
  osc.start(start);
  osc.stop(end + 0.02);
}

type Noise = {
  dur: number;
  freq: number;
  vol: number;
  to?: number;
  q?: number;
  type?: BiquadFilterType;
  attack?: number;
  delay?: number;
  wet?: number;
};

export function noise(b: Bus, t: number, o: Noise) {
  const { ctx } = b;
  const start = t + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = b.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? "lowpass";
  if (o.q !== undefined) f.Q.value = o.q;
  f.frequency.setValueAtTime(o.freq, start);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, start + o.dur);
  const g = ctx.createGain();
  const end = envelope(g.gain, start, o.vol, o.attack ?? 0.002, o.dur);
  src.connect(f).connect(g);
  release([src], [f, g, ...route(b, g, o.wet ?? 0)]);
  src.start(start, Math.random() * b.noise.duration);
  src.stop(end + 0.02);
}
