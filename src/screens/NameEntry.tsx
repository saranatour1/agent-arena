import { useState } from "react";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "../../convex/_generated/api";

export function NameEntry() {
  const claim = useMutation(api.users.claimUsername);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm border-2 bg-card/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="banner-text text-5xl">ENTER YOUR NAME</CardTitle>
          <CardDescription>3–16 letters or numbers. It shows on the leaderboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPending(true);
              void claim({ username: name })
                .then((r) => setError(r.ok ? null : r.error))
                .catch(() => setError("Something went wrong. Try again."))
                .finally(() => setPending(false));
            }}
          >
            <Input
              aria-label="Fighter name"
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="h-12 text-center font-display text-2xl tracking-widest"
              autoFocus
              required
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending} className="font-display text-xl tracking-wider">
              OK
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
