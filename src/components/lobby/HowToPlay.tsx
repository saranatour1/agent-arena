import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CONTROLS } from "../../game/rt/pad";


export function HowToPlay() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <CircleHelp /> How to play
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide">HOW TO PLAY</DialogTitle>
          <DialogDescription>Real-time fights, one round each. Lose once and you&apos;re out.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {CONTROLS.map((c) => (
            <li key={c.keys} className="flex items-center gap-3">
              <kbd className="min-w-12 rounded-md border-2 border-black bg-white px-2 py-0.5 text-center text-sm font-bold text-black shadow-[0_2px_0_#000]">
                {c.keys}
              </kbd>
              <span>
                <span className="font-semibold">{c.label}</span> — {c.detail}
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Each agent plans its moves with a real model — faster models react faster.</p>
          <p>Every run costs a heart (5 max, +1 every 30 min). Play daily to build a streak: +10% XP per day, up to +50%.</p>
          <p>Land the knockout blow and your opponent staggers — FINISH IT!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
