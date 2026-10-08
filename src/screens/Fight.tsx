import { useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { FIGHTERS } from "../../convex/game/fighters";
import type { CostumeId } from "../../convex/game/progress";
import type { Combatant } from "../components/FighterSprite";
import { Arena } from "../components/fight/Arena";
import { Controls } from "../components/fight/Controls";
import { Hud } from "../components/fight/Hud";
import { METER_MAX } from "../game/rt/engine";
import { announce } from "../game/rt/announcer";
import { CONTROLS } from "../game/rt/pad";
import { STAGES, stageFor } from "../game/stages";
import { useMatchLoop } from "../hooks/useMatchLoop";

export function Fight({
  run,
  match,
  username,
  costume,
}: {
  run: Doc<"runs">;
  match: Doc<"matches"> | null;
  username: string;
  costume: CostumeId;
}) {
  const forfeit = useMutation(api.game.forfeitRun);
  const quit = (
    <button
      type="button"
      onClick={() => {
        if (confirm("Quit this run? The heart you spent won't come back.")) void forfeit();
      }}
      className="self-center text-xs text-white/80 underline"
    >
      Quit run
    </button>
  );
  if (!match || match.winner !== null) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="banner-text anim-blink text-5xl sm:text-7xl">{run.phase === "showdown" ? "NEXT BOUT…" : "GET READY…"}</p>
        {quit}
      </main>
    );
  }
  return <LiveMatch key={match._id} run={run} match={match} username={username} costume={costume} quit={quit} />;
}

function LiveMatch({
  run,
  match,
  username,
  costume,
  quit,
}: {
  run: Doc<"runs">;
  match: Doc<"matches">;
  username: string;
  costume: CostumeId;
  quit: React.ReactNode;
}) {
  const sides = match.sides as Combatant[];
  const names = useMemo(
    () => sides.map((c) => (c === "player" ? username.toUpperCase() : FIGHTERS[c].name)) as [string, string],
    [sides, username],
  );
  const { w, brains, pad, fx, summoned, playerSide, arenaRef, shakeRef } = useMatchLoop(match, sides, names);

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 px-3 py-3">
        <Hud
          w={w}
          sides={sides}
          names={names}
          costumes={[costume, costume]}
          brains={brains}
          title={`${run.phase === "showdown" ? "AGENT SHOWDOWN · " : ""}${match.label}`}
          subtitle={STAGES[stageFor(sides, match.label)].name}
        />
        <Arena
          w={w}
          sides={sides}
          costumes={[costume, costume]}
          brains={brains}
          fx={fx.list}
          banner={announce(w, names, playerSide)}
          arenaRef={arenaRef}
          shakeRef={shakeRef}
        />
        {playerSide >= 0 ? (
          <>
            <Controls pad={pad} specialCharge={Math.floor((w.f[playerSide].meter / METER_MAX) * 20) / 20} />
            <p className="hidden text-center text-xs text-white/80 sm:block">
              {CONTROLS.map((c) => `${c.keys} ${c.label.toUpperCase()}`).join(" · ")}
            </p>
          </>
        ) : (
          <p className="text-outline text-center text-xs leading-relaxed">
            YOU&apos;RE OUT WITH {run.score.toLocaleString()} PTS. NOW THE AGENTS FIGHT FOR THE CROWN!
            {summoned && <span className="block text-[#38e1ff]">SONNET CALLED IN HAIKU SUB-AGENTS!</span>}
          </p>
        )}
        {quit}
      </div>
    </main>
  );
}
