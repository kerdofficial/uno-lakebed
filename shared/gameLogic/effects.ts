import type { Card, CardColor, CardType, GameMode, GameState } from "../gameTypes";
import { getGameModeConfig } from "./modes";

const WILD_TYPES: CardType[] = [
  "wild",
  "wild4",
  "wildReverseDraw4",
  "wildDraw6",
  "wildDraw10",
  "wildColorRoulette",
];

export function isWildCard(card: Card): boolean {
  return WILD_TYPES.includes(card.type);
}

export function cardNeedsColorChoice(card: Card): boolean {
  return isWildCard(card);
}

export function getDrawAmount(card: Card): number {
  if (card.type === "draw2") return 2;
  if (card.type === "draw4" || card.type === "wild4" || card.type === "wildReverseDraw4") return 4;
  if (card.type === "wildDraw6") return 6;
  if (card.type === "wildDraw10") return 10;
  return 0;
}

export function isDrawCard(card: Card, gameMode: GameMode): boolean {
  return getGameModeConfig(gameMode).drawTypes.includes(card.type) && getDrawAmount(card) > 0;
}

export function getLastDrawCard(discardPile: Card[], gameMode: GameMode): Card | null {
  for (let index = discardPile.length - 1; index >= 0; index--) {
    const card = discardPile[index];
    if (isDrawCard(card, gameMode)) return card;
  }
  return null;
}

export function getLastDrawType(discardPile: Card[], gameMode: GameMode): CardType {
  return getLastDrawCard(discardPile, gameMode)?.type || "draw2";
}

export function canStackCard(
  card: Card,
  lastDrawCard: Card | null,
  gameMode: GameMode
): boolean {
  if (!isDrawCard(card, gameMode)) return false;
  if (gameMode !== "noMercy") {
    if (!lastDrawCard || lastDrawCard.type === "draw2") {
      return card.type === "draw2" || card.type === "wild4";
    }
    return card.type === "wild4";
  }

  return getDrawAmount(card) >= getDrawAmount(lastDrawCard || card);
}

export function getNumberParity(cards: Card[], value: number): "odd" | "even" | "none" {
  const count = cards.filter((card) => card.type === "number" && card.value === value).length;
  if (count === 0) return "none";
  return count % 2 === 0 ? "even" : "odd";
}

export function isMatchingRouletteCard(card: Card, chosenColor: CardColor): boolean {
  return !!card.color && card.color === chosenColor && !isWildCard(card);
}

export function makePublicEventId(state: GameState, type: string): string {
  return `${type}-${state.discardPile.length}-${state.drawPile.length}-${Date.now()}`;
}
