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
    <div className="flex justify-center gap-2 mb-1">
      {view.unoCallable && (
        <button
          onClick={onUno}
          className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full hover:bg-red-500 animate-pulse"
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
            className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full hover:bg-orange-500"
          >
            Catch {player?.displayName}!
          </button>
        );
      })}
      {view.mustDraw && (
        <button
          onClick={onDraw}
          className="px-3 py-1 bg-red-700 text-white text-xs font-bold rounded-full hover:bg-red-600 animate-pulse"
        >
          {view.phase === "stacking" ? `Draw ${view.pendingDrawCount}` : "Draw"}
        </button>
      )}
    </div>
  );
}
