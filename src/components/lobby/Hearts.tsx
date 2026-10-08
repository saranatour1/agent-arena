import { useEffect, useState } from "react";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { Heart } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "../../../convex/_generated/api";

const CAPACITY = 5;
const REFILL_MS = 30 * 60 * 1000;

// Arcade credits from the rate-limiter token bucket.
export function Hearts() {
  const { check } = useRateLimit(api.limits.getHearts, {
    getServerTimeMutation: api.limits.getServerTime,
    count: 1,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const state = check(now);
  if (!state) return <div className="h-10 w-40 animate-pulse rounded-xl border border-border bg-card/60" aria-hidden />;
  const raw = state.value;
  const value = Math.floor(raw);
  const msToNext = value >= CAPACITY ? 0 : Math.ceil((1 - (raw - value)) * REFILL_MS);
  const mm = Math.floor(msToNext / 60000);
  const ss = Math.floor((msToNext % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div role="img" className="flex items-center gap-1 rounded-xl border border-border bg-card/80 px-3 py-2" aria-label={`${value} of ${CAPACITY} hearts`}>
          {Array.from({ length: CAPACITY }, (_, i) => (
            <Heart
              key={i}
              className={`size-5 ${i < value ? "fill-primary text-primary drop-shadow-[0_0_6px_#e8192c]" : "text-muted-foreground/50"}`}
            />
          ))}
          {value < CAPACITY && <span className="ml-1 text-xs tabular-nums text-muted-foreground">{mm}:{ss}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {value >= CAPACITY ? "Hearts full — each run costs one." : `Next heart in ${mm}:${ss}. One heart refills every 30 minutes.`}
      </TooltipContent>
    </Tooltip>
  );
}
