import { useRef, useEffect, useState } from "preact/hooks";
import type { PlayerView } from "../../../shared/gameTypes";
import { CARD_BORDER_COLORS, CARD_GLOW_SHADOW } from "../../utils/cardUi";
import { UnoCard } from "../cards/UnoCard";
import { DirectionIndicator } from "./DirectionIndicator";

type PlayAreaProps = {
  view: PlayerView;
  onDraw: () => void;
  isMyTurn: boolean;
};

export function PlayArea({ view, onDraw, isMyTurn }: PlayAreaProps) {
  const currentPlayer = view.turnOrder[view.currentPlayerIndex];

  const prevDiscardIdRef = useRef(view.discardTop.id);
  const [discardAnimStyle, setDiscardAnimStyle] = useState<Record<string, string>>({});

  const prevLastActionRef = useRef(view.lastAction);
  const [actionAnimKey, setActionAnimKey] = useState(0);

  useEffect(() => {
    if (view.discardTop.id !== prevDiscardIdRef.current) {
      prevDiscardIdRef.current = view.discardTop.id;
      setDiscardAnimStyle({
        animation: "card-arrive 0.3s ease-out",
      });
      const timer = setTimeout(() => setDiscardAnimStyle({}), 300);
      return () => clearTimeout(timer);
    }
  }, [view.discardTop.id]);

  useEffect(() => {
    if (view.lastAction !== prevLastActionRef.current) {
      prevLastActionRef.current = view.lastAction;
      if (view.lastAction) {
        setActionAnimKey((k) => k + 1);
      }
    }
  }, [view.lastAction]);

  const glowShadow = CARD_GLOW_SHADOW[view.currentColor] || "";

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-3">
        <DirectionIndicator direction={view.direction} />

        {isMyTurn ? (
          <div
            className="bg-amber-400/10 px-4 py-1 rounded-full"
            style={{ animation: "turn-pulse 2s ease-in-out infinite" }}
          >
            <span className="text-base md:text-lg font-bold text-amber-300">
              YOUR TURN
            </span>
          </div>
        ) : (
          currentPlayer && (
            <span className="text-sm text-neutral-400">
              {currentPlayer.displayName}'s turn
            </span>
          )
        )}
      </div>

      {view.phase === "stacking" && view.pendingDrawCount > 0 && (
        <div
          className="bg-red-600/90 text-white font-bold text-base px-4 py-2 rounded-xl"
          style={{ animation: "stack-pulse 1s ease-in-out infinite" }}
        >
          +{view.pendingDrawCount} stacked
        </div>
      )}

      <div className="flex items-center gap-8">
        <button
          onClick={onDraw}
          className="relative group hover:scale-105 transition-transform"
          disabled={!view.canPlay && !view.canStack && !view.mustDraw}
        >
          <div className="relative group-disabled:opacity-50">
            <div className="absolute" style={{ transform: "translate(2px, 2px)" }}>
              <UnoCard card={{ id: "", color: null, type: "wild", value: null }} faceDown size="normal" />
            </div>
            <div className="absolute" style={{ transform: "translate(1px, 1px)" }}>
              <UnoCard card={{ id: "", color: null, type: "wild", value: null }} faceDown size="normal" />
            </div>
            <div className="relative">
              <UnoCard card={{ id: "", color: null, type: "wild", value: null }} faceDown size="normal" />
            </div>
          </div>

          <div className="absolute -top-2 -right-2 bg-neutral-700 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
            {view.drawPileCount}
          </div>
        </button>

        <div
          className="relative rounded-xl"
          style={{ boxShadow: glowShadow }}
        >
          <UnoCard
            card={view.discardTop}
            size="large"
            animationStyle={discardAnimStyle}
            playable={true}
            hoverable={false}
          />
        </div>
      </div>

      {view.lastAction && (
        <div
          key={actionAnimKey}
          className="bg-neutral-800/80 backdrop-blur-sm text-neutral-300 text-sm px-4 py-1.5 rounded-full mt-2"
          style={{ animation: "fade-slide-in 0.4s ease-out" }}
        >
          {view.lastAction}
        </div>
      )}
    </div>
  );
}
