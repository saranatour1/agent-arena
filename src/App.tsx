import { useState } from "react";
import { AuthLoading, Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../convex/_generated/api";
import { Title } from "./screens/Title";
import { NameEntry } from "./screens/NameEntry";
import { Intro } from "./screens/Intro";
import { PracticePreview, Pvp, PVP_STAGE } from "./screens/Pvp";
import { Lobby } from "./screens/Lobby";
import { Fight } from "./screens/Fight";
import { Results } from "./screens/Results";
import { StageBackdrop } from "./components/StageBackdrop";
import { STAGES, stageFor, type StageId } from "./game/stages";
import { ConvexMark } from "./components/ConvexMark";
import { SoundToggle } from "./components/SoundToggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useUnlockToasts } from "./hooks/useUnlockToasts";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { localToday, startRunError, timeZone } from "./game/profile";
import { sfx } from "./game/sfx";

// Dev only: preview any arena with ?stage=bamboo|neon|volcano|temple, the intro with ?intro,
// a practice fight (no sign-in) with ?practice
const params = new URLSearchParams(window.location.search);
const previewStage = ((): StageId | undefined => {
  if (!import.meta.env.DEV) return undefined;
  const s = params.get("stage");
  return s && s in STAGES ? (s as StageId) : undefined;
})();
const previewIntro = import.meta.env.DEV && params.has("intro");
const previewPractice = import.meta.env.DEV && params.has("practice");

export default function App() {
  if (previewPractice) {
    return (
      <>
        <StageBackdrop stage={PVP_STAGE} />
        <PracticePreview />
      </>
    );
  }
  if (previewIntro) {
    return (
      <>
        <StageBackdrop stage={previewStage} />
        <Intro onDone={() => (window.location.search = "")} />
      </>
    );
  }
  return (
    <TooltipProvider>
      <ConvexMark />
      <SoundToggle />
      <Toaster position="top-center" richColors />
      <AuthLoading>
        <Loading />
      </AuthLoading>
      <Unauthenticated>
        <StageBackdrop stage={previewStage} />
        <Title />
      </Unauthenticated>
      <Authenticated>
        <Game />
      </Authenticated>
    </TooltipProvider>
  );
}

function Game() {
  const user = useQuery(api.users.loggedInUser);
  const current = useQuery(api.game.myRun);
  const profile = useQuery(api.game.profile, { today: localToday() });
  useUnlockToasts(profile);
  const [seenRunId, markSeen] = useStored("seenRunId");
  const [introSeen, markIntroSeen] = useStored("introSeen");
  const [replayIntro, setReplayIntro] = useState(false);
  const [pvp, setPvp] = useState(false);
  const startRun = useMutation(api.game.startRun);
  const closeIntro = () => {
    markIntroSeen("1");
    setReplayIntro(false);
  };
  const enterArena = async () => {
    closeIntro();
    sfx.coin();
    try {
      await startRun({ timeZone: timeZone() });
    } catch (e) {
      toast.error(startRunError(e));
    }
  };

  if (user === undefined || current === undefined || profile === undefined) return <Loading />;
  if (user === null || profile === null) return <Loading stuck />;
  if (user.username === null) return <NameEntry />;

  const run = current?.run;
  const live = run && run.phase !== "done";
  const stage =
    previewStage ?? (live && current.match ? stageFor(current.match.sides, current.match.label) : pvp ? PVP_STAGE : "temple");
  return (
    <>
      <StageBackdrop stage={stage} />
      {!live && (replayIntro || (!run && profile.runs === 0 && !introSeen)) ? (
        <Intro onDone={closeIntro} onStart={() => void enterArena()} />
      ) : pvp && !live ? (
        <Pvp username={user.username} costume={profile.costume} onExit={() => setPvp(false)} />
      ) : live ? (
        <Fight run={run} match={current.match} username={user.username} costume={profile.costume} />
      ) : run && seenRunId !== run._id ? (
        <Results run={run} profile={profile} username={user.username} onContinue={() => markSeen(run._id)} />
      ) : (
        <Lobby username={user.username} profile={profile} onIntro={() => setReplayIntro(true)} onPvp={() => setPvp(true)} />
      )}
    </>
  );
}

// A localStorage value that survives reloads; private mode just won't persist it.
function useStored(key: string) {
  const [value, setValue] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  });
  const save = (next: string) => {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // storage unavailable
    }
  };
  return [value, save] as const;
}

function Loading({ stuck = false }: { stuck?: boolean }) {
  const { signOut } = useAuthActions();
  return (
    <>
      <StageBackdrop stage={previewStage} />
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="banner-text anim-blink text-5xl">LOADING…</p>
        {stuck && (
          <Button variant="outline" onClick={() => void signOut()}>
            Log out
          </Button>
        )}
      </main>
    </>
  );
}
