import type { Card, CardColor, GameMode, GameState } from "../gameTypes";
import { canStackCard, getLastDrawCard, isWildCard } from "./effects";
import { getPlacements, getRevivableFinishedPlayers } from "./state";

export function isCardPlayable(
  card: Card,
  topDiscard: Card,
  currentColor: CardColor,
  gameMode: GameMode = "regular"
): boolean {
  if (isWildCard(card)) return true;
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
  currentColor: CardColor,
  gameMode: GameMode = "regular"
): Card[] {
  return hand.filter((card) => isCardPlayable(card, topDiscard, currentColor, gameMode));
}

export function getStackableCards(
  hand: Card[],
  discardPile: Card[],
  gameMode: GameMode = "regular"
): Card[] {
  const lastDrawCard = getLastDrawCard(discardPile, gameMode);
  return hand.filter((card) => canStackCard(card, lastDrawCard, gameMode));
}

export function checkWinner(state: GameState): string | null {
  if (state.phase === "stacking") return null;
  if (state.phase === "chooseSevenSwapTarget") return null;
  if (getRevivableFinishedPlayers(state).length > 0) return null;
  if (state.gameMode === "noMercy") {
    const activePlayers = state.turnOrder.filter((playerId) => !state.finishedPlayers.includes(playerId));
    if (activePlayers.length === 0) return getPlacements(state)[0] || state.winner;
  }
  return getPlacements(state).length === state.turnOrder.length ? state.winner : null;
}
