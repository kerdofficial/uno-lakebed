import type { PlayerView } from "../../../shared/gameTypes";
import { CARD_BORDER_COLORS, CARD_GLOW } from "../../utils/cardUi";
import { UnoCard } from "../cards/UnoCard";
import { DirectionIndicator } from "./DirectionIndicator";

type PlayAreaProps = {
  view: PlayerView;
  onDraw: () => void;
};

export function PlayArea({ view, onDraw }: PlayAreaProps) {
  const currentPlayer = view.turnOrder[view.currentPlayerIndex];
  const colorBorder = CARD_BORDER_COLORS[view.currentColor] || "border-white";
  const colorGlow = CARD_GLOW[view.currentColor] || "";

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center gap-2">
        <DirectionIndicator direction={view.direction} />
        {currentPlayer && (
          <span className="text-xs text-neutral-400">
            {currentPlayer.displayName}'s turn
          </span>
        )}
        {view.phase === "stacking" && (
          <span className="text-xs text-red-400 font-bold">
            Stack: +{view.pendingDrawCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onDraw}
          className="relative group"
          disabled={!view.canPlay && !view.canStack && !view.mustDraw}
        >
          <div className="w-[56px] h-[84px] md:w-[72px] md:h-[108px] rounded-lg border-2 border-neutral-600 bg-neutral-800 flex items-center justify-center transition-all group-hover:border-neutral-400 group-disabled:opacity-50">
            <div className="w-[60%] h-[60%] rounded-full bg-red-700 flex items-center justify-center">
              <span className="text-white font-black text-[10px] md:text-xs">
                UNO
              </span>
            </div>
          </div>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-neutral-500">
            {view.drawPileCount}
          </span>
        </button>

        <div className={`relative rounded-xl p-1 border-2 ${colorBorder} shadow-lg ${colorGlow}`}>
          <UnoCard card={view.discardTop} />
        </div>
      </div>

      {view.lastAction && (
        <div className="text-[11px] text-neutral-500 text-center mt-4">
          {view.lastAction}
        </div>
      )}
    </div>
  );
}
