// Arcade sound, all procedural (no audio files): Web Audio effects plus a
// speech-synthesis announcer. Muting persists per browser.
export { setMuted, useMuted } from "./sfx/engine";
export { blip, sfx } from "./sfx/effects";
export { say } from "./sfx/announcer";
