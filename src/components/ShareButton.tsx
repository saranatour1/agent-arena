import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { FIGHTERS } from "../../convex/game/fighters";
import type { Profile } from "../game/profile";

const SITE = (import.meta.env.VITE_CONVEX_URL as string).replace(".convex.cloud", ".convex.site");
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Renders this run's share card, uploads it, then opens X's composer with a
// link whose preview shows the card.
export function ShareButton({ run, profile, username }: { run: Doc<"runs">; profile: Profile; username: string }) {
  const generateUploadUrl = useMutation(api.share.generateUploadUrl);
  const saveCard = useMutation(api.share.saveCard);
  const [pending, setPending] = useState(false);

  const share = async () => {
    // Open the tab synchronously so pop-up blockers allow it.
    const tab = window.open("about:blank", "_blank");
    setPending(true);
    try {
      if (!run.shareImage) {
        const { renderCardPng } = await import("../game/ogCard");
        const png = await renderCardPng({
          subtitle:
            run.beaten === 4
              ? `${username} beat all 4 agents.\nNone of them survived.`
              : `${username} beat ${run.beaten} of 4 agents.\n${run.champion ? `${titleCase(FIGHTERS[run.champion].name)} survived the arena.` : "Can you beat AI?"}`,
          footer: `score ${run.score.toLocaleString()} · lv ${profile.level}`,
        });
        const res = await fetch(await generateUploadUrl(), { method: "POST", headers: { "Content-Type": "image/png" }, body: png });
        const { storageId } = (await res.json()) as { storageId: string };
        await saveCard({ runId: run._id, storageId: storageId as never });
      }
      const text =
        run.beaten === 4
          ? `I cleared the Agent Arena gauntlet — beat Haiku, Sonnet, Jev AND Opus 🥊 Score ${run.score.toLocaleString()}.`
          : `I beat ${run.beaten}/4 AI agents in Agent Arena 🥊 Score ${run.score.toLocaleString()}. Can you beat Opus?`;
      const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${SITE}/api/share/${run._id}`)}`;
      if (tab) tab.location.href = intent;
      else window.open(intent, "_blank");
    } catch {
      tab?.close();
      toast.error("Couldn't create the share card. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="lg" variant="secondary" className="flex-1" disabled={pending} onClick={() => void share()}>
      <XLogo /> {pending ? "Making your card…" : "Share on X"}
    </Button>
  );
}
