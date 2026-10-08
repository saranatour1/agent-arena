// Floating top-left mark; fixed so it never takes layout space.
export function ConvexMark() {
  return (
    <a
      href="https://www.convex.dev"
      target="_blank"
      rel="noreferrer"
      aria-label="Convex"
      className="fixed top-2 left-2 z-50 inline-flex opacity-85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transition-opacity hover:opacity-100 sm:top-3 sm:left-3"
    >
      <img src="/convex.svg" alt="" className="size-5 sm:size-6" />
    </a>
  );
}
