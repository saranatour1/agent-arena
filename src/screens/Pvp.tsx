import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { FIGHTERS, GAUNTLET, type FighterId } from "../../convex/game/fighters";
import type { CostumeId } from "../../convex/game/progress";
import type { Combatant } from "../components/FighterSprite";
import { Arena } from "../components/fight/Arena";
import { Controls } from "../components/fight/Controls";
import { Hud } from "../components/fight/Hud";
import { METER_MAX, MATCH_END_FRAMES } from "../game/rt/engine";
import { announce } from "../game/rt/announcer";
import { CONTROLS } from "../game/rt/pad";
import { STAGES } from "../game/stages";
import { usePvpLoop, type Opponent } from "../hooks/usePvpLoop";

export const PVP_STAGE = "neon" as const;
const HEARTBEAT_MS = 2500;
const BOT_AFTER_S = 20;
const NO_BRAINS = [null, null];

type Match = NonNullable<(typeof api.pvp.myMatch)["_returnType"]>;

// Online PvP: free, ranked. Search → fight another person → result. Nobody
// around after 20s: a free practice fight against a scripted agent.
export function Pvp({ username, costume, onExit }: { username: string; costume: CostumeId; onExit: () => void }) {
  const findMatch = useMutation(api.pvp.findMatch);
  const leaveQueue = useMutation(api.pvp.leaveQueue);
  const match = useQuery(api.pvp.myMatch);
  const [active, setActive] = useState<Id<"pvpMatches"> | null>(null);
  const [bot, setBot] = useState<FighterId | null>(null);
  const [since, setSince] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const searching = active === null && bot === null;

  // Stay in the queue with a heartbeat; whoever pairs us, findMatch hands back the match.
  useEffect(() => {
    if (!searching) return;
    const ping = () =>
      void findMatch({}).then(
        (r) => r && setActive(r.matchId),
        () => {},
      );
    ping();
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - since >= BOT_AFTER_S * 1000) {
        void leaveQueue({});
        setBot(GAUNTLET[Math.floor(Math.random() * GAUNTLET.length)]);
      } else ping();
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [searching, since, findMatch, leaveQueue]);

  const searchAgain = () => {
    setActive(null);
    setBot(null);
    setSince(Date.now());
    setNow(Date.now());
  };
  const exit = () => {
    void leaveQueue({});
    onExit();
  };

  if (bot) return <BotFight key={since} who={bot} username={username} costume={costume} onAgain={searchAgain} onExit={exit} />;
  if (active && match?._id === active) return <NetFight key={active} match={match} onAgain={searchAgain} onExit={exit} />;

  const waited = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <p className="font-display text-outline-thin text-lg tracking-[0.3em] text-white/80">RANKED · FREE</p>
      <h1 className="banner-text anim-blink text-6xl sm:text-7xl">FINDING OPPONENT…</h1>
      <p className="flex items-center gap-2 text-white/90">
        <Loader2 className="size-4 animate-spin" />
        {waited}s · nobody yet? A practice fight starts at {BOT_AFTER_S}s.
      </p>
      <Button variant="ghost" onClick={exit}>
        Cancel
      </Button>
    </main>
  );
}

// Dev-only preview of the practice fight (?practice): no sign-in or server needed.
export function PracticePreview() {
  const [round, setRound] = useState(0);
  return (
    <BotFight key={round} who="haiku" username="YOU" costume="crimson" onAgain={() => setRound(round + 1)} onExit={() => setRound(round + 1)} />
  );
}

function FightFrame({
  title,
  loop,
  sides,
  names,
  costumes,
  children,
}: {
  title: string;
  loop: ReturnType<typeof usePvpLoop>;
  sides: Combatant[];
  names: [string, string];
  costumes: [CostumeId, CostumeId];
  children?: React.ReactNode;
}) {
  const { w, pad, fx, mySide, arenaRef, shakeRef } = loop;
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 px-3 py-3">
        <Hud w={w} sides={sides} names={names} costumes={costumes} brains={NO_BRAINS} title={title} subtitle={STAGES[PVP_STAGE].name} />
        <Arena
          w={w}
          sides={sides}
          costumes={costumes}
          brains={NO_BRAINS}
          fx={fx.list}
          banner={announce(w, names, mySide)}
          arenaRef={arenaRef}
          shakeRef={shakeRef}
        />
        <Controls pad={pad} specialCharge={Math.floor((w.f[mySide].meter / METER_MAX) * 20) / 20} />
        <p className="hidden text-center text-xs text-white/80 sm:block">
          {CONTROLS.map((c) => `${c.keys} ${c.label.toUpperCase()}`).join(" · ")}
        </p>
        {children}
      </div>
    </main>
  );
}

function NetFight({ match, onAgain, onExit }: { match: Match; onAgain: () => void; onExit: () => void }) {
  const forfeit = useMutation(api.pvp.forfeit);
  const opp = useMemo<Opponent>(() => ({ kind: "net", matchId: match._id, side: match.side }), [match._id, match.side]);
  const sides = useMemo<Combatant[]>(() => ["player", "player"], []);
  const names = useMemo(() => match.names.map((n) => n.toUpperCase()) as [string, string], [match.names]);
  const costumes = match.costumes as [CostumeId, CostumeId];
  const loop = usePvpLoop(opp, sides, names);
  const won = match.winner === match.side;

  return (
    <FightFrame title="RANKED PVP" loop={loop} sides={sides} names={names} costumes={costumes}>
      {match.status === "live" ? (
        <>
          {loop.waitingMs > 1000 && (
            <p className="text-outline absolute inset-x-0 top-1/3 text-center text-lg">Waiting for {names[1 - match.side]}…</p>
          )}
          <button
            type="button"
            className="self-center text-xs text-white/80 underline"
            onClick={() => {
              if (confirm("Leave this match? It counts as a loss.")) void forfeit({ matchId: match._id });
            }}
          >
            Leave match
          </button>
        </>
      ) : (
        <ResultOverlay
          headline={match.endedBy === "abandoned" ? "NO CONTEST" : won ? "YOU WIN!" : "YOU LOSE"}
          detail={
            match.endedBy === "abandoned"
              ? "Nobody finished this match. Ratings didn't change."
              : `${match.endedBy === "forfeit" ? (won ? `${names[1 - match.side]} left the match. ` : "You left the match. ") : ""}PvP rating ${won ? "+" : "−"}${match.ratingChange ?? 0}`
          }
          again="Find another"
          onAgain={onAgain}
          onExit={onExit}
        />
      )}
    </FightFrame>
  );
}

function BotFight({
  who,
  username,
  costume,
  onAgain,
  onExit,
}: {
  who: FighterId;
  username: string;
  costume: CostumeId;
  onAgain: () => void;
  onExit: () => void;
}) {
  const opp = useMemo<Opponent>(() => ({ kind: "bot", who }), [who]);
  const sides = useMemo<Combatant[]>(() => ["player", who], [who]);
  const names = useMemo(() => [username.toUpperCase(), FIGHTERS[who].name] as [string, string], [username, who]);
  const loop = usePvpLoop(opp, sides, names);
  const over = loop.w.phase === "matchEnd" && loop.w.phaseT >= MATCH_END_FRAMES;

  return (
    <FightFrame title="PRACTICE · NOBODY ONLINE" loop={loop} sides={sides} names={names} costumes={[costume, "crimson"]}>
      {over ? (
        <ResultOverlay
          headline={loop.w.winner === 0 ? "YOU WIN!" : "YOU LOSE"}
          detail="Practice fights are free and unranked. Search again to fight a person."
          again="Find opponent"
          onAgain={onAgain}
          onExit={onExit}
        />
      ) : (
        <button type="button" className="self-center text-xs text-white/80 underline" onClick={onExit}>
          Leave practice
        </button>
      )}
    </FightFrame>
  );
}

function ResultOverlay({
  headline,
  detail,
  again,
  onAgain,
  onExit,
}: {
  headline: string;
  detail: string;
  again: string;
  onAgain: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black/70 px-4 text-center">
      <h2 className={`banner-text anim-banner-stay text-6xl sm:text-8xl ${headline === "YOU LOSE" ? "banner-red" : ""}`}>{headline}</h2>
      <p className="text-lg text-white/90">{detail}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" className="font-display text-xl" onClick={onAgain}>
          {again}
        </Button>
        <Button size="lg" variant="ghost" onClick={onExit}>
          Lobby
        </Button>
      </div>
    </div>
  );
}
