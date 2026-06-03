export function UnoSplash() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ animation: "uno-splash 1.5s ease-out forwards" }}
    >
      <span
        className="text-red-500 font-black text-7xl md:text-9xl"
        style={{ textShadow: "0 0 40px rgba(239,68,68,0.8), 0 4px 8px rgba(0,0,0,0.5)" }}
      >
        UNO!
      </span>
    </div>
  );
}
