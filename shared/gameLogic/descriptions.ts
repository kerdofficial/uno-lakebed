import type { Card, CardColor } from "../gameTypes";

export function cardLabel(card: Card): string {
  if (card.type === "wild") return "Wild";
  if (card.type === "wild4") return "+4";
  if (card.type === "draw2") return `${card.color} +2`;
  if (card.type === "skip") return `${card.color} Skip`;
  if (card.type === "reverse") return `${card.color} Reverse`;
  return `${card.color} ${card.value}`;
}

export function buildActionDescription(
  playerId: string,
  cards: Card[],
  chosenColor?: CardColor
): string {
  const labels = cards.map(cardLabel).join(", ");
  let description = `${playerId} played ${labels}`;
  if (chosenColor) description += ` (chose ${chosenColor})`;
  return description;
}

export function actionWithDisplayNames(
  action: string | null,
  players: { userId: string; displayName: string; picture: string }[]
): string | null {
  if (!action) return action;

  let displayAction = action;
  const sortedPlayers = [...players].sort((left, right) => right.userId.length - left.userId.length);

  for (const player of sortedPlayers) {
    displayAction = displayAction
      .split(player.userId)
      .join(player.displayName || player.userId);
  }

  return displayAction;
}
