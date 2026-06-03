import { useRef, useEffect, useState } from "preact/hooks";

export function DirectionIndicator({ direction }: { direction: 1 | -1 }) {
  const prevDir = useRef(direction);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (prevDir.current !== direction) {
      prevDir.current = direction;
      setFlipped(true);
      const t = setTimeout(() => setFlipped(false), 500);
      return () => clearTimeout(t);
    }
  }, [direction]);

  return (
    <div
      className="w-8 h-8 rounded-full border border-neutral-600 flex items-center justify-center text-neutral-400"
      style={flipped ? { animation: "direction-flip 0.5s ease-in-out" } : {}}
    >
      <span className="text-lg">{direction === 1 ? "↻" : "↺"}</span>
    </div>
  );
}
