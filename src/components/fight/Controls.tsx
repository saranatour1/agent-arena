import { memo, type ReactNode } from "react";
import type { Attack } from "../../game/rt/engine";
import { CONTROLS, press, type PadState } from "../../game/rt/pad";

const hint = (label: (typeof CONTROLS)[number]["label"]) => CONTROLS.find((c) => c.label === label)!.hint;

function PadButton({
  label,
  hint,
  color,
  onDown,
  onUp,
  ring,
  children,
}: {
  label: string;
  hint: string;
  color: string;
  onDown: () => void;
  onUp?: () => void;
  ring?: number; // 0..1 charge ring
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} (${hint})`}
      className="move-btn flex touch-none flex-col items-center gap-1 select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span
        className="relative grid size-12 place-items-center rounded-full sm:size-[72px]"
        style={{ background: `conic-gradient(${color} ${(ring ?? 1) * 360}deg, rgba(0,0,0,.6) 0)` }}
      >
        <span
          className="grid size-[40px] place-items-center rounded-full border-[3px] border-black sm:size-[60px]"
          style={{
            background:
              ring === undefined || ring >= 1
                ? `radial-gradient(circle at 35% 30%, #fff8 0%, ${color} 45%, #000a 120%)`
                : "radial-gradient(circle at 35% 30%, #fff4, #555 50%, #222)",
          }}
        >
          <svg viewBox="0 0 32 32" className="size-6 sm:size-9" fill="#fff" stroke="#000" strokeWidth={1.6} strokeLinejoin="round">
            {children}
          </svg>
        </span>
        <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-black bg-white px-1 text-[8px] text-black">
          {hint}
        </span>
      </span>
      <span className="font-display text-outline-thin text-xs tracking-wider sm:text-sm">{label}</span>
    </button>
  );
}

export const Controls = memo(function Controls({ pad, specialCharge }: { pad: PadState; specialCharge: number }) {
  const hold = (k: "left" | "right" | "block") => ({
    onDown: () => {
      pad[k] = true;
    },
    onUp: () => {
      pad[k] = false;
    },
  });
  const tap = (a: Attack) => ({
    onDown: () => press(pad, a),
  });
  return (
    <div className="flex items-end justify-between gap-1 px-1 sm:gap-2">
      <div className="flex gap-1.5 sm:gap-3">
        <PadButton label="BACK" hint="←" color="#9aa4b8" {...hold("left")}>
          <path d="M20 6 L8 16 L20 26 Z" />
        </PadButton>
        <PadButton label="FWD" hint="→" color="#9aa4b8" {...hold("right")}>
          <path d="M12 6 L24 16 L12 26 Z" />
        </PadButton>
      </div>
      <div className="flex gap-1.5 sm:gap-3">
        <PadButton label="BLOCK" hint={hint("Block")} color="#19b8d6" {...hold("block")}>
          <path d="M16 3 l11 4 v8 c0 7 -5 12 -11 14 c-6 -2 -11 -7 -11 -14 v-8 z" />
        </PadButton>
        <PadButton label="PUNCH" hint={hint("Punch")} color="#e8192c" {...tap("punch")}>
          <path d="M6 14 h14 a4 4 0 0 1 0 8 h-2 v3 a3 3 0 0 1 -3 3 h-9 a4 4 0 0 1 -4 -4 v-6 a4 4 0 0 1 4 -4 z M8 14 v-3 a2 2 0 0 1 4 0 v3 M12 14 v-4 a2 2 0 0 1 4 0 v4 M16 14 v-3 a2 2 0 0 1 4 0 v3" />
        </PadButton>
        <PadButton label="KICK" hint={hint("Kick")} color="#ff8a1f" {...tap("kick")}>
          <path d="M5 6 l6 10 l10 -2 l6 -4 a2.5 2.5 0 0 1 2 4 l-7 6 l-12 3 a3 3 0 0 1 -3 -2 l-5 -12 a2 2 0 0 1 3 -3 z" />
        </PadButton>
        <PadButton label="SPECIAL" hint={hint("Special")} color="#ffc400" ring={specialCharge} {...tap("special")}>
          <path d="M17 2 c1 6 8 8 8 16 a9 9 0 0 1 -18 0 c0 -4 2 -6 4 -8 c0 3 1 5 3 6 c-1 -6 1 -10 3 -14 z" />
        </PadButton>
      </div>
    </div>
  );
});
