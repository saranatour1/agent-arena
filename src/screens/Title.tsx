import { useState } from "react";
import { FighterSprite } from "../components/FighterSprite";
import { FIGHTERS, GAUNTLET } from "../../convex/game/fighters";
import { sfx } from "../game/sfx";
import { Login } from "./Login";

export function Title() {
  const [started, setStarted] = useState(false);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <h1 className="banner-text text-center text-7xl leading-[0.85] sm:text-9xl">
        AGENT
        <br />
        ARENA
      </h1>
      <p className="font-display text-outline-thin max-w-md text-center text-xl tracking-wide sm:text-2xl">
        Beat Haiku, Sonnet, Jev &amp; Opus. When you fall, the agents fight each other.
      </p>
      <div className="flex flex-wrap items-end justify-center gap-3">
        {GAUNTLET.map((id) => (
          <div key={id} className="flex flex-col items-center">
            <FighterSprite who={id} height={140} />
            <span className="font-display text-outline-thin text-xl tracking-wide" style={{ color: FIGHTERS[id].color }}>
              {FIGHTERS[id].name}
            </span>
          </div>
        ))}
      </div>
      {started ? (
        <Login />
      ) : (
        <button
          type="button"
          onClick={() => {
            sfx.coin();
            setStarted(true);
          }}
          className="banner-text anim-blink text-5xl sm:text-6xl"
        >
          PRESS START
        </button>
      )}
    </main>
  );
}
