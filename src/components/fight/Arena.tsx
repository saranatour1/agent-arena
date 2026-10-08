import type { RefObject } from "react";
import { FighterSprite, type Combatant } from "../FighterSprite";
import { facing, type World } from "../../game/rt/engine";
import { TAUNT_SHOW, type Brain } from "../../game/rt/brain";
import type { Fx } from "../../game/rt/fx";
import { arenaPose } from "../../game/rt/pose";
import { POSES } from "../../game/poses";
import type { CostumeId } from "../../../convex/game/progress";
import { colorOf } from "../../hooks/fightFx";
import { Banners, type BannerItem } from "./Banner";
import { HitSpark } from "./Effects";
import { VictoryBurst } from "./VictoryBurst";

// World x (0–1000) → CSS left; sprites are offset so their body centre sits on x.
const atX = (x: number, offset: number) => `calc(${x / 10}% - ${offset}px * var(--s))`;

export function Arena({
  w,
  sides,
  costumes,
  brains,
  fx,
  banner,
  arenaRef,
  shakeRef,
}: {
  w: World;
  sides: Combatant[];
  costumes: [CostumeId, CostumeId]; // per side, for human fighters
  brains: (Brain | null)[];
  fx: Fx[];
  banner: { items: BannerItem[]; key: string; persistLast: boolean };
  arenaRef: RefObject<HTMLDivElement | null>;
  shakeRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={arenaRef} className="arena relative w-full flex-1 overflow-hidden" style={{ minHeight: "calc(250px * var(--s) + 30px)" }}>
      <div ref={shakeRef} className="absolute inset-0">
        {w.phase === "matchEnd" && w.winner !== null && (
          <VictoryBurst key="victory" x={w.f[w.winner].x} color={colorOf(sides[w.winner])} />
        )}
        {w.f.map((f, i) => {
          const face = facing(w, i as 0 | 1);
          return (
            <div key={i} className="absolute z-10" style={{ left: atX(f.x, face > 0 ? 85 : 95), bottom: 24 }}>
              <FighterSprite
                who={sides[i]}
                facing={face > 0 ? "right" : "left"}
                height={200}
                className="arena-sprite"
                pose={arenaPose(w, i as 0 | 1, sides[i])}
                costume={costumes[i]}
              />
            </div>
          );
        })}

        {w.assists
          .filter((a) => !a.done && a.t >= a.delay)
          .map((a) => (
            <div key={a.id} className="absolute z-20" style={{ left: atX(a.x, a.dir > 0 ? 53 : 59), bottom: 24 }}>
              <FighterSprite
                who="haiku"
                facing={a.dir > 0 ? "right" : "left"}
                height={124}
                style={{ width: "calc(112px * var(--s))", height: "calc(124px * var(--s))" }}
                pose={Math.floor(a.t / 6) % 2 ? POSES.walkA : POSES.walkB}
              />
            </div>
          ))}

        {w.projectiles.map((p) => (
          <div
            key={p.owner}
            aria-hidden
            className="absolute z-20 -translate-x-1/2 rounded-full"
            style={{
              left: `${p.x / 10}%`,
              bottom: "calc(24px + 112px * var(--s))",
              width: "calc(46px * var(--s))",
              height: "calc(46px * var(--s))",
              background: `radial-gradient(circle, #fff 0%, #fff3a0 25%, ${colorOf(sides[p.owner])} 60%, transparent 72%)`,
              boxShadow: `0 0 30px 12px ${colorOf(sides[p.owner])}`,
            }}
          />
        ))}

        {brains.map((b, i) =>
          b && b.taunt && w.frame - b.tauntFrame < TAUNT_SHOW ? (
            <div
              key={`${i}-${b.tauntFrame}`}
              className="anim-pop absolute z-20 max-w-44 -translate-x-1/2 rounded-lg border-2 border-black bg-white px-2 py-1 text-center text-[11px] leading-snug text-black shadow-[3px_3px_0_#000]"
              style={{ left: `${w.f[i].x / 10}%`, bottom: "calc(24px + 215px * var(--s))" }}
            >
              {b.taunt}
            </div>
          ) : null,
        )}

        {fx.map((e) =>
          e.kind === "spark" ? (
            <HitSpark
              key={e.id}
              x={`${e.x / 10}%`}
              bottom={`calc(24px + ${e.h}px * var(--s))`}
              size={e.size}
              color={e.color}
              blocked={e.blocked}
            />
          ) : e.kind === "dmg" ? (
            <span
              key={e.id}
              className="font-display anim-float text-outline-thin absolute z-30 -translate-x-1/2 text-3xl text-[#ffe14d] sm:text-5xl"
              style={{ left: `${e.x / 10}%`, bottom: "calc(24px + 180px * var(--s))" }}
            >
              -{e.amount}
            </span>
          ) : (
            <p
              key={e.id}
              className="font-display fx-callout text-outline-thin absolute top-6 z-30 max-w-[60%] text-2xl tracking-wide sm:text-4xl"
              style={{ color: e.color, ...(e.side === 0 ? { left: "3%" } : { right: "3%", textAlign: "right" }) }}
            >
              {e.text}
            </p>
          ),
        )}
      </div>
      <Banners items={banner.items} sequenceKey={banner.key} persistLast={banner.persistLast} />
    </div>
  );
}
