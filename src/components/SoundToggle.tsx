import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setMuted, sfx, useMuted } from "../game/sfx";

// Fixed top-right mute switch (remembered per browser).
export function SoundToggle() {
  const muted = useMuted();
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Mute sound"
      aria-pressed={muted}
      className="fixed top-2 right-2 z-50 border-2 border-black bg-black/65 backdrop-blur-sm sm:top-3 sm:right-3"
      onClick={() => {
        setMuted(!muted);
        if (muted) sfx.click();
      }}
    >
      {muted ? <VolumeX /> : <Volume2 />}
    </Button>
  );
}
