// Match-win flourish over the arena: a spotlight on the winner and a burst of
// confetti. Plays once via CSS; reduced motion keeps only the light.

const PIECES = 30;
const GOLDEN = 2.399963; // radians; spreads pieces evenly without visible rows

export function VictoryBurst({ x, color }: { x: number; color: string }) {
  const palette = [color, "#ffd23f", "#ffffff", "#ff5fa2", color, "#38e1ff"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="victory-light victory-beam absolute top-0 -translate-x-1/2"
        style={{ left: `${x / 10}%`, bottom: 14, width: "calc(280px * var(--s))" }}
      />
      <div
        className="victory-light absolute -translate-x-1/2 rounded-[50%]"
        style={{
          left: `${x / 10}%`,
          bottom: 10,
          width: "calc(230px * var(--s))",
          height: "calc(34px * var(--s))",
          background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)`,
        }}
      />
      {Array.from({ length: PIECES }, (_, i) => {
        const angle = -Math.PI / 2 + Math.sin(i * GOLDEN) * 1.25; // mostly upward
        const dist = 70 + ((i * 37) % 80);
        return (
          <span
            key={i}
            className="confetti absolute z-30"
            style={{
              left: `${x / 10}%`,
              bottom: "calc(24px + 150px * var(--s))",
              width: i % 3 ? 7 : 9,
              height: i % 3 ? 11 : 9,
              borderRadius: i % 3 ? 2 : 9999,
              background: palette[i % palette.length],
              animationDelay: `${(i % 2) * 0.35 + (i % 5) * 0.03}s`,
              ["--dx" as string]: `calc(${(Math.cos(angle) * dist).toFixed(1)}px * var(--s))`,
              ["--dy" as string]: `calc(${(Math.sin(angle) * dist).toFixed(1)}px * var(--s))`,
              ["--fall" as string]: `calc(${150 + ((i * 53) % 90)}px * var(--s))`,
              ["--r" as string]: `${((i * 97) % 360) - 180}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
