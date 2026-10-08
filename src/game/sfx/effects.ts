// Arcade sound effects. Every hit is built fresh from layers with a little
// random pitch, timing and filter drift so no two sound exactly alike.
import { audio, noise, rnd, tone, vary, type Bus } from "./engine";

type Sound = (b: Bus, t: number) => void;

type Impact = { thump: [number, number]; dur: number; crack: number; meat: number; vol: number; wet: number };

// A struck body: a falling sine thump, a bright slap, and a dull flesh-and-cloth layer.
function impact(b: Bus, t: number, s: Impact) {
  const at = t + rnd(0, 0.012);
  const v = vary(s.vol, 0.12);
  const dur = vary(s.dur, 0.15);
  tone(b, at, {
    from: vary(s.thump[0], 0.12),
    to: vary(s.thump[1], 0.1),
    dur,
    vol: v,
    type: "sine",
    attack: 0.003,
    detune: rnd(-40, 40),
    wet: s.wet,
  });
  noise(b, at + rnd(0, 0.004), {
    dur: vary(0.045, 0.3),
    freq: vary(s.crack, 0.2),
    q: rnd(0.8, 1.6),
    type: "bandpass",
    vol: v * 1.3,
    attack: 0.001,
    wet: s.wet,
  });
  noise(b, at, { dur: dur * vary(0.7, 0.2), freq: vary(s.meat, 0.15), to: s.meat * 0.4, vol: v * 0.6, wet: s.wet });
}

const PUNCH: Impact = { thump: [170, 60], dur: 0.12, crack: 2400, meat: 1000, vol: 0.5, wet: 0.12 };
const KICK: Impact = { thump: [125, 42], dur: 0.19, crack: 1700, meat: 700, vol: 0.62, wet: 0.16 };
const BLAST: Impact = { thump: [95, 30], dur: 0.5, crack: 1800, meat: 1400, vol: 0.7, wet: 0.3 };
const KO: Impact = { thump: [150, 30], dur: 0.9, crack: 1500, meat: 900, vol: 0.8, wet: 0.35 };

const chime = (notes: number[], type: OscillatorType, vol: number, len: number, gap: number, wet: number): Sound =>
  (b, t) =>
    notes.forEach((f, i) => tone(b, t, { from: f, to: f, dur: len, type, vol, delay: i * gap, detune: rnd(-6, 6), wet }));

export const sounds = {
  punch: (b, t) => impact(b, t, PUNCH),
  kick: (b, t) => impact(b, t, KICK),
  block: (b, t) => {
    const at = t + rnd(0, 0.008);
    tone(b, at, { from: vary(900, 0.06), to: vary(600, 0.06), dur: 0.08, vol: 0.1, cutoff: 2600, wet: 0.1 });
    tone(b, at, { from: vary(220, 0.1), to: 120, dur: 0.07, vol: 0.3, type: "sine", attack: 0.002 });
    noise(b, at, { dur: vary(0.05, 0.2), freq: vary(3000, 0.15), q: 1.5, type: "bandpass", vol: 0.35, attack: 0.001, wet: 0.1 });
  },
  blast: (b, t) => {
    impact(b, t, BLAST);
    noise(b, t, { dur: 0.45, freq: vary(2600, 0.15), to: 220, vol: 0.45, attack: 0.004, wet: 0.35 });
  },
  ko: (b, t) => {
    impact(b, t, KO);
    noise(b, t, { dur: 0.8, freq: 1800, to: 150, vol: 0.5, wet: 0.4 });
    tone(b, t, { from: 440, to: 110, dur: 0.9, vol: 0.2, type: "triangle", delay: 0.05, wet: 0.3 });
  },
  summon: chime([660, 880, 1320], "triangle", 0.2, 0.12, 0.08, 0.2),
  coin: (b, t) => {
    tone(b, t, { from: 988, to: 988, dur: 0.08, vol: 0.18, attack: 0.002 });
    tone(b, t, { from: 1319, to: 1319, dur: 0.35, vol: 0.18, attack: 0.002, delay: 0.08, wet: 0.08 });
  },
  click: (b, t) => tone(b, t, { from: 1200, to: 900, dur: 0.04, vol: 0.08, attack: 0.002 }),
  unlock: chime([784, 988, 1175, 1568], "triangle", 0.2, 0.14, 0.07, 0.15),
  levelUp: chime([523, 659, 784, 1047, 1319], "square", 0.15, 0.16, 0.09, 0.1),
} satisfies Record<string, Sound>;

// The "tn" of dialogue typing out; pitch follows the speaker (1 = neutral).
export function blip(pitch = 1) {
  const b = audio();
  if (!b) return;
  const f = vary(560 * pitch, 0.04);
  tone(b, b.ctx.currentTime, { from: f, to: f * 0.8, dur: 0.035, vol: 0.07, type: "square", attack: 0.002, cutoff: 2800 });
}

const play = (s: Sound) => () => {
  const b = audio();
  if (b) s(b, b.ctx.currentTime);
};

type Sfx = Record<keyof typeof sounds, () => void>;
export const sfx = Object.fromEntries(Object.entries(sounds).map(([k, s]) => [k, play(s)])) as Sfx;
