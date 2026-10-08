// Hit / block spark layered over the arena; plays once via CSS.

export function HitSpark({
  x,
  bottom,
  size,
  color = "#ffb000",
  blocked = false,
}: {
  x: string;
  bottom: string;
  size: number;
  color?: string;
  blocked?: boolean;
}) {
  const gid = `sg-${blocked ? "block" : color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div
      aria-hidden
      className="fx-spark pointer-events-none absolute z-20"
      style={{
        left: x,
        bottom,
        width: `calc(${size}px * var(--s) / 1.3)`,
        height: `calc(${size}px * var(--s) / 1.3)`,
        transform: "translate(-50%, 50%)",
      }}
    >
      <svg viewBox="-50 -50 100 100" width="100%" height="100%">
        <defs>
          <radialGradient id={gid}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.35" stopColor={blocked ? "#bff4ff" : "#fff3a0"} />
            <stop offset="0.7" stopColor={blocked ? "#2ee6f0" : color} />
            <stop offset="1" stopColor={blocked ? "#2ee6f0" : color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon
          points="0,-48 9,-14 40,-30 16,-4 48,4 14,12 30,40 2,18 -12,46 -10,14 -42,26 -16,2 -46,-14 -12,-12 -26,-40 -4,-16"
          fill={`url(#${gid})`}
        />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <line
            key={a}
            x1="0" y1="0" x2="0" y2="-46"
            transform={`rotate(${a + 20})`}
            stroke={blocked ? "#e8fdff" : "#fff6c8"}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}

