import { afterEach, describe, expect, test, vi } from "vitest";
import { say, setMuted, sfx } from "./sfx";
import { pickVoice } from "./sfx/announcer";

const voice = (name: string, lang = "en-US", localService = true) =>
  ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

afterEach(() => {
  vi.unstubAllGlobals();
  setMuted(false);
});

describe("sound", () => {
  test("is a silent no-op without Web Audio / speech (e.g. tests, old browsers)", () => {
    expect(globalThis.AudioContext).toBeUndefined();
    for (const play of Object.values(sfx)) expect(() => play()).not.toThrow();
    expect(() => say("Fight!")).not.toThrow();
  });

  test("never opens an AudioContext while muted", () => {
    let opened = 0;
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          opened++;
        }
      },
    );
    setMuted(true);
    sfx.punch();
    sfx.ko();
    expect(opened).toBe(0);
  });

  test("an AudioContext that fails to start is tried once, then left alone", async () => {
    let tries = 0;
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          tries++;
          throw new Error("no audio device");
        }
      },
    );
    vi.resetModules();
    const fresh = await import("./sfx");
    expect(() => {
      fresh.sfx.punch();
      fresh.sfx.ko();
    }).not.toThrow();
    expect(tries).toBe(1);
  });

  test("mute is remembered", () => {
    setMuted(true);
    expect(localStorage.getItem("sfxMuted")).toBe("1");
    setMuted(false);
    expect(localStorage.getItem("sfxMuted")).toBe("0");
  });
});

describe("announcer", () => {
  test("prefers natural, high-quality English voices", () => {
    let pool = [
      voice("Fred"),
      voice("Samantha"),
      voice("Google US English", "en-US", false),
      voice("Daniel (Enhanced)", "en-GB"),
      voice("Ava (Premium)"),
      voice("Microsoft Guy Online (Natural) - English (United States)", "en-US", false),
      voice("Amélie (Premium)", "fr-CA"),
    ];
    const ranked: string[] = [];
    for (let v = pickVoice(pool); v; v = pickVoice(pool)) {
      ranked.push(v.name);
      pool = pool.filter((x) => x !== v);
    }
    expect(ranked).toEqual([
      "Microsoft Guy Online (Natural) - English (United States)",
      "Ava (Premium)",
      "Daniel (Enhanced)",
      "Google US English",
      "Samantha",
    ]);
    expect(pickVoice([])).toBeUndefined();
  });

  test("time-critical calls cut in; the rest wait their turn", () => {
    type Utterance = { text: string; onend: (() => void) | null };
    const said: Utterance[] = [];
    const synth = {
      speaking: false,
      pending: false,
      cancel: vi.fn(),
      getVoices: () => [],
      speak: (u: Utterance) => {
        said.push(u);
        synth.speaking = true;
      },
    };
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        onend = null;
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    );

    say("Perfect!");
    say("You win!");
    expect(said.map((u) => u.text)).toEqual(["Per... fect!"]);
    said[0].onend?.();
    expect(said.map((u) => u.text)).toEqual(["Per... fect!", "You win!"]);

    synth.cancel.mockClear();
    say("Fight!");
    expect(synth.cancel).toHaveBeenCalled();
    expect(said[said.length - 1].text).toBe("Fight!");
  });
});
