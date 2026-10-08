import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FighterSprite } from "../FighterSprite";
import { levelProgress, type Profile } from "../../game/profile";

// Player card in the lobby header: portrait, name, level, XP to next level.
export function ProfileChip({ username, profile }: { username: string; profile: Profile }) {
  const { span, into, pct } = levelProgress(profile);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-3 py-2">
      <div className="hud-portrait shrink-0">
        <FighterSprite who="player" portrait height={44} costume={profile.costume} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display truncate text-xl leading-none tracking-wide">{username.toUpperCase()}</span>
          <Badge className="bg-accent text-accent-foreground">LV {profile.level}</Badge>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Progress value={pct} className="h-2 w-28 sm:w-36" aria-label="XP to next level" />
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            {profile.title} · {into}/{span} XP
          </span>
        </div>
      </div>
    </div>
  );
}
