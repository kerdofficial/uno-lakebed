export function DirectionIndicator({ direction }: { direction: 1 | -1 }) {
  return (
    <div className="text-neutral-500 text-xs font-mono">
      {direction === 1 ? "⟳ CW" : "⟲ CCW"}
    </div>
  );
}
