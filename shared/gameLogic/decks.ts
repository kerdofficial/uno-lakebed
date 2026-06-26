import type { Card, CardColor, CardType, GameMode } from "../gameTypes";

const COLORS: CardColor[] = ["red", "yellow", "green", "blue"];

function pushCopies(
  cards: Card[],
  count: number,
  getCard: (copyIndex: number) => Card
) {
  for (let copyIndex = 0; copyIndex < count; copyIndex++) {
    cards.push(getCard(copyIndex));
  }
}

export function createRegularDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of COLORS) {
    cards.push({ id: `${color}-0-0`, color, type: "number", value: 0 });

    for (let value = 1; value <= 9; value++) {
      cards.push({ id: `${color}-${value}-0`, color, type: "number", value });
      cards.push({ id: `${color}-${value}-1`, color, type: "number", value });
    }

    for (const type of ["skip", "reverse", "draw2"] as CardType[]) {
      cards.push({ id: `${color}-${type}-0`, color, type, value: null });
      cards.push({ id: `${color}-${type}-1`, color, type, value: null });
    }
  }

  for (let index = 0; index < 4; index++) {
    cards.push({ id: `wild-${index}`, color: null, type: "wild", value: null });
    cards.push({ id: `wild4-${index}`, color: null, type: "wild4", value: null });
  }

  return cards;
}

export function createNoMercyDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of COLORS) {
    for (let value = 0; value <= 9; value++) {
      pushCopies(cards, 2, (copyIndex) => ({
        id: `no-mercy-${color}-${value}-${copyIndex}`,
        color,
        type: "number",
        value,
      }));
    }

    for (const [type, count] of [
      ["skip", 3],
      ["skipAll", 2],
      ["reverse", 3],
      ["draw2", 3],
      ["draw4", 2],
      ["discardAll", 3],
    ] as [CardType, number][]) {
      pushCopies(cards, count, (copyIndex) => ({
        id: `no-mercy-${color}-${type}-${copyIndex}`,
        color,
        type,
        value: null,
      }));
    }
  }

  for (const [type, count] of [
    ["wildReverseDraw4", 8],
    ["wildDraw6", 4],
    ["wildDraw10", 4],
    ["wildColorRoulette", 8],
  ] as [CardType, number][]) {
    pushCopies(cards, count, (copyIndex) => ({
      id: `no-mercy-${type}-${copyIndex}`,
      color: null,
      type,
      value: null,
    }));
  }

  return cards;
}

export function createDeckForMode(gameMode: GameMode): Card[] {
  return gameMode === "noMercy" ? createNoMercyDeck() : createRegularDeck();
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex], shuffled[index]];
  }
  return shuffled;
}
