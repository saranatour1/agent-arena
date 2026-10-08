import { memo, type ReactNode } from "react";
import type { StageId } from "../game/stages";
import { Bamboo, BambooFx, BambooNear } from "./stage/Bamboo";
import { Neon, NeonBuzz, NeonFx } from "./stage/Neon";
import { Temple, TempleFx, TempleSprig } from "./stage/Temple";
import { Volcano, VolcanoFx } from "./stage/Volcano";
import "./stage/ambient.css";

// The arena backdrop: fixed behind the current screen, hidden from assistive tech.

const PARTICLE: Record<StageId, string> = {
  temple: "petal",
  bamboo: "firefly",
  neon: "raindrop",
  volcano: "ember",
};

type Box = [x: number, y: number, w: number, h: number];

// `art` is the static painting: its own compositor layer, rasterized once. Each of `layers`
// gets a separate <svg> so its `motion` class can sway or flicker it without repainting
// the scene. `fx` is CSS-animated light and mist on top.
type Scene = {
  art: ReactNode;
  layers?: { art: ReactNode; box: Box; motion: string }[];
  fx?: ReactNode;
};

const SCENES: Record<StageId, Scene> = {
  temple: {
    art: <Temple />,
    layers: [
      { art: <TempleSprig x={150} seed={31} />, box: [-60, -30, 460, 260], motion: "amb-sway" },
      { art: <TempleSprig x={1460} seed={37} />, box: [1220, -30, 440, 260], motion: "amb-sway amb-late" },
    ],
    fx: <TempleFx />,
  },
  bamboo: {
    art: <Bamboo />,
    layers: [
      { art: <BambooNear side={-1} />, box: [-80, -60, 360, 1000], motion: "amb-wind" },
      { art: <BambooNear side={1} />, box: [1320, -60, 360, 1000], motion: "amb-wind amb-late" },
    ],
    fx: <BambooFx />,
  },
  neon: {
    art: <Neon />,
    layers: [{ art: <NeonBuzz />, box: [940, 160, 190, 130], motion: "amb-buzz" }],
    fx: <NeonFx />,
  },
  volcano: {
    art: <Volcano />,
    fx: <VolcanoFx />,
  },
};

const place = ([x, y, w, h]: Box) => ({ left: `${x / 16}%`, top: `${y / 9}%`, width: `${w / 16}%`, height: `${h / 9}%` });

export const StageBackdrop = memo(function StageBackdrop({ stage = "temple" }: { stage?: StageId }) {
  const { art, layers = [], fx } = SCENES[stage];
  const kind = PARTICLE[stage];
  const count = stage === "neon" ? 40 : 16;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#140c1c] [container-type:size]">
      <div className="absolute bottom-0 left-1/2 aspect-[16/9] w-[max(100cqw,177.78cqh)] -translate-x-1/2">
        <svg className="absolute inset-0 size-full will-change-transform" viewBox="0 0 1600 900">
          {art}
          <Vignette id={stage} />
        </svg>
        {layers.map(({ art, box, motion }, i) => (
          <svg key={i} className={`absolute overflow-visible ${motion}`} style={place(box)} viewBox={box.join(" ")}>
            {art}
          </svg>
        ))}
        {fx}
      </div>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={`${stage}-${i}`}
          className={kind}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${((i * 1.3) % 9).toFixed(2)}s`,
            animationDuration: `${kind === "raindrop" ? 0.7 + (i % 5) * 0.12 : 6 + ((i * 7) % 6)}s`,
            ...(kind === "firefly" ? { top: `${30 + ((i * 23) % 55)}%` } : {}),
            ...(kind === "petal" ? { width: 6 + (i % 4) * 2, height: (6 + (i % 4) * 2) * 0.7 } : {}),
          }}
        />
      ))}
    </div>
  );
});

function Vignette({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`vig-${id}`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#vig-${id})`} />
    </>
  );
}
