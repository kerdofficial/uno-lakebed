const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-400", "bg-green-500", "bg-pink-500", "bg-purple-500"];

export function Confetti() {
  const pieces = Array.from({ length: 45 }, (_, i) => {
    const driftX = ((i * 37) % 200) - 100;
    const delay = ((i * 73) % 2000) / 1000;
    const size = 4 + ((i * 13) % 6);
    const colorClass = COLORS[i % COLORS.length];
    const left = ((i * 17) % 100);

    return (
      <div
        key={i}
        className={`absolute ${colorClass} rounded-sm pointer-events-none`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          top: "-10px",
          "--drift-x": `${driftX}px`,
          animation: `confetti-fall 3s ease-in ${delay}s both`,
        } as any}
      />
    );
  });

  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
      {pieces}
    </div>
  );
}
