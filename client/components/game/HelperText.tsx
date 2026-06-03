import type { PlayerView } from "../../../shared/gameTypes";

type HelperTextProps = {
  view: PlayerView;
  isMyTurn: boolean;
  hasSelectedCards: boolean;
};

export function HelperText({ view, isMyTurn, hasSelectedCards }: HelperTextProps) {
  let text = "";

  if (view.unoCallable) {
    text = "You have 1 card - call UNO!";
  } else if (view.unoCatchable.length > 0) {
    const player = view.turnOrder.find((p) => p.userId === view.unoCatchable[0]);
    text = `${player?.displayName || "Someone"} forgot to call UNO - catch them!`;
  } else if (isMyTurn && view.phase === "play" && !hasSelectedCards) {
    if (view.playableCardIds.length > 0) {
      text = "Tap a card to select it";
    } else {
      text = "No playable cards - draw from the pile!";
    }
  } else if (view.canStack && view.stackableCardIds.length > 0) {
    text = `Stack a +2/+4, or draw ${view.pendingDrawCount} cards`;
  } else if (view.mustDraw && view.phase === "stacking") {
    text = `You must draw ${view.pendingDrawCount} cards`;
  } else if (!isMyTurn && view.phase !== "finished") {
    const current = view.turnOrder[view.currentPlayerIndex];
    text = `Waiting for ${current?.displayName || "..."}`;
  }

  if (!text) return null;

  return (
    <div
      className="text-xs text-neutral-500 italic text-center py-1"
      style={{ animation: "fade-slide-in 0.3s ease-out" }}
    >
      {text}
    </div>
  );
}
