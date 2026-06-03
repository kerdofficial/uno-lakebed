import type { Card, CardColor, GameState } from "../gameTypes";

export function isCardPlayable(
  card: Card,
  topDiscard: Card,
  currentColor: CardColor
): boolean {
  if (card.type === "wild" || card.type === "wild4") return true;
  if (card.color === currentColor) return true;
  if (card.type === "number" && topDiscard.type === "number" && card.value === topDiscard.value) {
    return true;
  }
  if (card.type !== "number" && card.type === topDiscard.type) return true;
  return false;
}

export function getPlayableCards(
  hand: Card[],
  topDiscard: Card,
  currentColor: CardColor
): Card[] {
  return hand.filter((card) => isCardPlayable(card, topDiscard, currentColor));
}

export function getStackableCards(
  hand: Card[],
  lastDrawType: "draw2" | "wild4"
): Card[] {
  if (lastDrawType === "draw2") {
    return hand.filter((card) => card.type === "draw2" || card.type === "wild4");
  }
  return hand.filter((card) => card.type === "wild4");
}

export function checkWinner(state: GameState): string | null {
  if (state.phase === "stacking") return null;

  for (const playerId of state.finishedPlayers) {
    const hand = state.hands[playerId];
    if (!hand || hand.length === 0) return playerId;
  }

  return null;
}
