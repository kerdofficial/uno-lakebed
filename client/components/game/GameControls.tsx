import type { PlayerView } from "../../../shared/gameTypes";

type GameControlsProps = {
  view: PlayerView;
  onUno: () => void;
  onDraw: () => void;
  onCatchUno: (targetUserId: string) => void;
};

export function GameControls({
  view,
  onUno,
  onDraw,
  onCatchUno,
}: GameControlsProps) {
  return (
    <div className="flex justify-center items-center gap-3 py-2">
      {view.unoCallable && (
        <button
          onClick={onUno}
          className="px-6 py-2.5 bg-red-600 text-white text-base font-black rounded-full shadow-lg hover:bg-red-700 transition-colors"
          style={{
            animation: "bounce-in 0.4s ease-out, glow-pulse 1.5s ease-in-out 0.4s infinite",
            "--glow-color": "rgba(239, 68, 68, 0.5)",
          } as any}
        >
          UNO!
        </button>
      )}
      {view.unoCatchable.map((userId) => {
        const player = view.turnOrder.find((entry) => entry.userId === userId);
        return (
          <button
            key={userId}
            onClick={() => onCatchUno(userId)}
            className="px-5 py-2 bg-orange-500 text-white text-sm font-bold rounded-full shadow-md hover:bg-orange-600 transition-colors"
            style={{ animation: "bounce-in 0.3s ease-out, shake 0.5s ease-in-out 0.3s" }}
          >
            Catch {player?.displayName}!
          </button>
        );
      })}
      {view.mustDraw && (
        <button
          onClick={onDraw}
          className={`px-5 py-2 text-white text-sm font-bold rounded-full shadow-md transition-colors ${
            view.phase === "stacking"
              ? "bg-red-700 hover:bg-red-800"
              : "bg-amber-600 hover:bg-amber-700"
          }`}
          style={{ animation: "bounce-in 0.3s ease-out" }}
        >
          {view.phase === "stacking" ? `Draw ${view.pendingDrawCount}` : "Draw a card"}
        </button>
      )}
    </div>
  );
}
