import { useState } from "react";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Clapperboard, Flame, LogOut, Swords, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "../../convex/_generated/api";
import { FIGHTERS, GAUNTLET } from "../../convex/game/fighters";
import { COSTUMES, COSTUME_IDS, beatAchievement } from "../../convex/game/progress";
import { FighterSprite } from "../components/FighterSprite";
import { Hearts } from "../components/lobby/Hearts";
import { Leaderboard } from "../components/lobby/Leaderboard";
import { ProfileChip } from "../components/lobby/ProfileChip";
import { Wardrobe } from "../components/lobby/Wardrobe";
import { HowToPlay } from "../components/lobby/HowToPlay";
import { STAGES, stageFor } from "../game/stages";
import { sfx } from "../game/sfx";
import { startRunError, streakBonusPct, timeZone, type Profile } from "../game/profile";

export function Lobby({
  username,
  profile,
  onIntro,
  onPvp,
}: {
  username: string;
  profile: Profile;
  onIntro: () => void;
  onPvp: () => void;
}) {
  const startRun = useMutation(api.game.startRun);
  const { signOut } = useAuthActions();
  const [pending, setPending] = useState(false);
  const beaten = new Set(profile.achievements);

  const play = async () => {
    sfx.coin();
    setPending(true);
    try {
      await startRun({ timeZone: timeZone() });
    } catch (e) {
      toast.error(startRunError(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="banner-text text-5xl leading-none sm:text-6xl">AGENT ARENA</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Hearts />
            <ProfileChip username={username} profile={profile} />
            <Button variant="ghost" onClick={onIntro}>
              <Clapperboard /> See intro
            </Button>
            <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => void signOut()}>
              <LogOut />
            </Button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* Roster + call to action */}
          <Card className="border-2 bg-card/85">
            <CardHeader>
              <CardTitle className="font-display text-3xl tracking-wide">THE GAUNTLET</CardTitle>
              <CardDescription>
                Four agents in a new random order every run. Lose once and you&apos;re out — then they fight each other for the crown.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {GAUNTLET.map((id) => {
                  const f = FIGHTERS[id];
                  const won = beaten.has(beatAchievement[id]);
                  return (
                    <li
                      key={id}
                      className="group relative flex flex-col items-center gap-1 overflow-hidden rounded-xl border-2 border-border bg-black/30 px-2 pt-2 pb-3 text-center transition hover:-translate-y-1 hover:border-[var(--c)]"
                      style={{ ["--c" as string]: f.color }}
                    >
                      {won && (
                        <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground" title="You've beaten this agent">
                          ✓
                        </Badge>
                      )}
                      <div className="transition group-hover:scale-105">
                        <FighterSprite who={id} height={140} />
                      </div>
                      <span className="font-display text-2xl leading-none tracking-wide" style={{ color: f.color }}>
                        {f.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{f.title}</span>
                      <span className="text-[11px] tracking-wider text-accent/90">{STAGES[stageFor([id])].name}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void play()}
                  className="pixel-btn anim-bob flex items-center gap-3 rounded-lg bg-primary px-10 py-4 text-primary-foreground disabled:opacity-60"
                >
                  <Swords className="size-6" />
                  <span className="font-display text-3xl tracking-wider">{pending ? "LOADING…" : "INSERT COIN — FIGHT!"}</span>
                </button>
                <p className="-mt-1 text-xs text-muted-foreground">Uses 1 heart</p>
                <Button size="lg" variant="secondary" onClick={onPvp} className="font-display text-xl tracking-wider">
                  <Users /> FIND OPPONENT
                </Button>
                <p className="-mt-1 text-xs text-muted-foreground">Fight another person · free · ranked</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <HowToPlay />
                  <Wardrobe profile={profile} />
                </div>
                <p className="text-center text-xs text-[#38e1ff]">Rumor: a low-health Sonnet facing Opus never fights alone…</p>
              </div>
            </CardContent>
          </Card>

          <aside className="flex flex-col gap-5">
            <StreakCard profile={profile} />
            <NextUnlockCard profile={profile} />
          </aside>
        </div>

        <Leaderboard achievements={profile.achievements} me={username} />
      </div>
    </main>
  );
}

// Daily streak: the main "come back tomorrow" hook.
function StreakCard({ profile }: { profile: Profile }) {
  const { playedToday } = profile;
  const bonus = streakBonusPct(profile.streak);
  const week = profile.streak % 7 || (profile.streak > 0 ? 7 : 0);
  return (
    <Card className="border-2 bg-card/85">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl tracking-wide">
          <Flame className="size-6 text-streak" /> DAILY STREAK
        </CardTitle>
        <CardDescription>
          {playedToday ? "Played today — come back tomorrow to keep it going." : "Play a run today to keep your streak."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <span className="font-display text-6xl leading-none text-streak">{profile.streak}</span>
          <span className="pb-1 text-sm text-muted-foreground">day{profile.streak === 1 ? "" : "s"}</span>
          {bonus > 0 && <Badge className="ml-auto bg-streak text-black">+{bonus}% XP</Badge>}
        </div>
        <div className="flex gap-1.5" aria-label={`${week} of 7 days this week`}>
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full ${i < week ? "bg-streak shadow-[0_0_8px_var(--color-streak)]" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Each day in a row adds +10% XP (up to +50%). Hit 3 and 7 days for trophies.</p>
      </CardContent>
    </Card>
  );
}

// The next outfit to unlock — a visible goal for the next few runs.
function NextUnlockCard({ profile }: { profile: Profile }) {
  const next = COSTUME_IDS.find((id) => COSTUMES[id].level > profile.level);
  return (
    <Card className="border-2 bg-card/85">
      <CardHeader>
        <CardTitle className="font-display text-2xl tracking-wide">NEXT UNLOCK</CardTitle>
        <CardDescription>
          {next ? `Reach level ${COSTUMES[next].level} to unlock this outfit.` : "Every outfit unlocked. Legend."}
        </CardDescription>
      </CardHeader>
      {next && (
        <CardContent className="flex items-center gap-3">
          <div className="opacity-80">
            <FighterSprite who="player" height={110} costume={next} still="idle" />
          </div>
          <div className="flex-1">
            <p className="font-display text-xl tracking-wide">{COSTUMES[next].name}</p>
            <Progress
              className="mt-2 h-2"
              value={Math.min(100, (profile.level / COSTUMES[next].level) * 100)}
              aria-label="Progress to the next outfit"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Level {profile.level} / {COSTUMES[next].level}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
