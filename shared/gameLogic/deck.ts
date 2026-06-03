import type { Card, CardColor, CardType } from "../gameTypes";

export function createDeck(): Card[] {
  const colors: CardColor[] = ["red", "yellow", "green", "blue"];
  const cards: Card[] = [];

  for (const color of colors) {
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

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex], shuffled[index]];
  }
  return shuffled;
}
