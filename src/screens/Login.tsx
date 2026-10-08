import { useState } from "react";
import { useOauth, useSignInWithGithub } from "@convex-dev/auth/providers/oauth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

// GitHub is the only way in. New players pick an arcade name right after.
export function Login() {
  const { signInGithub } = useSignInWithGithub(api.auth);
  const { flowError } = useOauth();
  const [pending, setPending] = useState(false);

  const start = () => {
    setPending(true);
    signInGithub().catch(() => setPending(false));
  };

  return (
    <Card className="w-full max-w-sm border-2 bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle className="font-display text-3xl tracking-wide">NEW CHALLENGER</CardTitle>
        <CardDescription>Sign in with GitHub to save your level, streak and trophies.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button size="lg" disabled={pending} onClick={start} className="font-display text-xl tracking-wider">
          <svg viewBox="0 0 16 16" className="size-5" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          {pending ? "OPENING GITHUB…" : "CONTINUE WITH GITHUB"}
        </Button>
        {flowError && (
          <p role="alert" className="text-sm text-destructive">
            GitHub sign-in didn&rsquo;t finish ({flowError.code}). Try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
