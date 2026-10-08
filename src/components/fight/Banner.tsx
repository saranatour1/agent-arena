// Big arcade announcer text: "ROUND 1", "FIGHT!", "FINISH IT!", "K.O."...
// Several banners play in sequence via CSS animation delays (no timers).
export type BannerItem = { text: string; color?: string };

const RED = "#e8192c";

export function Banners({
  items,
  sequenceKey,
  persistLast = false,
}: {
  items: BannerItem[];
  sequenceKey: string;
  persistLast?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div
      key={sequenceKey}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      {items.map((b, i) => (
        <div
          key={i}
          role="status"
          className={`banner-text absolute px-2 text-center text-6xl leading-[0.95] whitespace-pre-line sm:text-8xl lg:text-9xl ${
            b.color === RED ? "banner-red" : ""
          } ${persistLast && i === items.length - 1 ? "anim-banner-stay" : "anim-banner"}`}
          style={{ animationDelay: `${i * 0.6}s` }}
        >
          {b.text}
        </div>
      ))}
    </div>
  );
}
