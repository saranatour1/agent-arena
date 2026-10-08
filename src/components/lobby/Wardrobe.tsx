import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Lock, Shirt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "../../../convex/_generated/api";
import { COSTUMES, COSTUME_IDS } from "../../../convex/game/progress";
import { FighterSprite } from "../FighterSprite";
import type { Profile } from "../../game/profile";

// Unlockable outfits for the challenger — a reason to keep leveling.
export function Wardrobe({ profile }: { profile: Profile }) {
  const setCostume = useMutation(api.game.setCostume);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <Shirt /> Wardrobe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide">WARDROBE</DialogTitle>
          <DialogDescription>Level up to unlock new outfits for your fighter.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COSTUME_IDS.map((id) => {
            const c = COSTUMES[id];
            const locked = profile.level < c.level;
            const active = profile.costume === id;
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                onClick={() =>
                  void setCostume({ costume: id }).then(
                    () => toast.success(`${c.name} equipped`),
                    (e: unknown) =>
                      toast.error(e instanceof ConvexError && typeof e.data === "string" ? e.data : "Couldn't equip that outfit. Try again."),
                  )
                }
                className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition ${
                  active ? "border-accent bg-accent/10" : "border-border hover:border-accent/60"
                } disabled:cursor-not-allowed`}
              >
                <div className={locked ? "opacity-55 saturate-75" : ""}>
                  <FighterSprite who="player" height={110} costume={id} still="idle" />
                </div>
                <span className="font-display text-base tracking-wide">{c.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {active ? "Equipped" : locked ? `Level ${c.level}` : "Tap to equip"}
                </span>
                {locked && <Lock className="absolute top-2 right-2 size-4 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
