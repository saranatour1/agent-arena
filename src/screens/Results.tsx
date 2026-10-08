import { useMutation } from "convex/react";
import { RotateCcw, Home } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { FIGHTERS, GAUNTLET } from "../../convex/game/fighters";
import { ACHIEVEMENTS, levelFor, type AchievementId } from "../../convex/game/progress";
import { FighterSprite } from "../components/FighterSprite";
import { ShareButton } from "../components/ShareButton";
import { levelProgress, startRunError, streakBonusPct, timeZone, type Profile } from "../game/profile";
import { sfx } from "../game/sfx";
import { useCountUp } from "../hooks/useCountUp";

export function Results({
  run,
  profile,
  username,
  onContinue,
}: {
  run: Doc<"runs">;
  profile: Profile;
  username: string;
  onContinue: () => void;
}) {
  const startRun = useMutation(api.game.startRun);
  const champ = run.champion ? FIGHTERS[run.champion] : null;
  const xpGained = run.xpGained ?? 0;
  const xpShown = useCountUp(xpGained);
  const leveledUp = levelFor(profile.xp - xpGained) < profile.level;
  const { pct } = levelProgress(profile);
  const bonus = streakBonusPct(profile.streak);
  const fresh = (run.newAchievements ?? []) as AchievementId[];

  const playAgain = async () => {
    sfx.coin();
    try {
      await startRun({ timeZone: timeZone() });
      onContinue();
    } catch (e) {
      toast.error(startRunError(e));
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-6 text-center">
      {champ ? (
        <>
          <p className="font-display text-outline-thin text-xl tracking-widest sm:text-2xl">THE AGENT SHOWDOWN IS OVER</p>
          <FighterSprite who={champ.id} height={220} victory />
          <h1 className="banner-text anim-banner-stay text-6xl sm:text-8xl">WINNER: {champ.name}</h1>
          <p className="font-display text-outline-thin text-lg sm:text-xl" style={{ color: champ.color }}>
            &ldquo;{champ.catchphrase}&rdquo;
          </p>
        </>
      ) : run.beaten === GAUNTLET.length ? (
        <>
          <p className="font-display text-outline-thin text-xl tracking-widest sm:text-2xl">ALL FOUR AGENTS DOWN</p>
          <FighterSprite who="player" costume={profile.costume} height={220} victory />
          <h1 className="banner-text anim-banner-stay text-6xl sm:text-8xl">YOU WIN!</h1>
          <p className="font-display text-outline-thin text-lg sm:text-xl">Humanity is the champion. No showdown needed.</p>
        </>
      ) : (
        <h1 className="banner-text banner-red anim-banner-stay text-7xl sm:text-9xl">GAME OVER</h1>
      )}

      <Card className="w-full max-w-lg border-2 bg-card/90 text-left backdrop-blur">
        <CardHeader>
          <CardTitle className="font-display text-3xl tracking-wide">RUN REWARDS</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Agents beaten" value={`${run.beaten}/4`} />
            <Stat label="Perfect rounds"value={String(run.perfects)} />
            <Stat label="Score" value={run.score.toLocaleString()} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-display text-4xl leading-none text-accent">+{xpShown} XP</span>
              {bonus > 0 && <Badge className="bg-streak text-black">🔥 {profile.streak}-day streak +{bonus}%</Badge>}
            </div>
            <Progress value={pct} className="h-3" aria-label="Level progress" />
            <p className="mt-1 text-xs text-muted-foreground">
              Level {profile.level} · {profile.title} · {profile.nextLevelXp - profile.xp} XP to level {profile.level + 1}
            </p>
            {leveledUp && <p className="banner-text mt-2 text-4xl">LEVEL UP!</p>}
          </div>

          {fresh.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">New trophies</p>
              <div className="flex flex-wrap gap-2">
                {fresh.map((id) => (
                  <Badge key={id} variant="outline" className="border-accent/60 py-1 text-sm">
                    {ACHIEVEMENTS[id]?.icon} {ACHIEVEMENTS[id]?.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="flex-1" onClick={() => void playAgain()}>
              <RotateCcw /> Play again
            </Button>
            <ShareButton run={run} profile={profile} username={username} />
            <Button size="lg" variant="outline" className="flex-1" onClick={onContinue}>
              <Home /> Lobby
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-black/30 px-2 py-2">
      <p className="font-display text-3xl leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
