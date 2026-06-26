import type { ActionTextPart, Card, CardColor } from "../gameTypes";

export function cardLabel(card: Card): string {
  if (card.type === "wild") return "Wild";
  if (card.type === "wild4") return "+4";
  if (card.type === "wildReverseDraw4") return "Wild Reverse +4";
  if (card.type === "wildDraw6") return "Wild +6";
  if (card.type === "wildDraw10") return "Wild +10";
  if (card.type === "wildColorRoulette") return "Wild Color Roulette";
  if (card.type === "draw2") return `${card.color?.charAt(0).toUpperCase() + card.color?.slice(1)} +2`;
  if (card.type === "draw4") return `${card.color?.charAt(0).toUpperCase() + card.color?.slice(1)} +4`;
  if (card.type === "skip") return `${card.color?.charAt(0).toUpperCase() + card.color?.slice(1)} Skip`;
  if (card.type === "skipAll") return `${card.color?.charAt(0).toUpperCase() + card.color?.slice(1)} Skip All`;
  if (card.type === "reverse") return `${card.color?.charAt(0).toUpperCase() + card.color?.slice(1)} Reverse`;
  if (card.type === "discardAll") return `${card.color?.charAt(0).toUpperCase() + card.color?.slice(1)} Discard All`;
  return `${card.color?.charAt(0).toUpperCase() + card.color?.slice(1)} ${card.value}`;
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

const COLOR_NAMES: CardColor[] = ["red", "yellow", "green", "blue"];

function parseCardLabelParts(label: string): ActionTextPart[] {
  const trimmed = label.trim();
  if (!trimmed) return [];

  const [firstWord, ...restWords] = trimmed.split(" ");
  const maybeColor = firstWord.toLowerCase() as CardColor;

  if (COLOR_NAMES.includes(maybeColor)) {
    const colorText = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    const restText = restWords.join(" ");
    return [
      { text: colorText, kind: "color", color: maybeColor },
      ...(restText ? [{ text: restText, kind: "card" as const }] : []),
    ];
  }

  return [{ text: trimmed, kind: "card" }];
}

function findPlayerDisplayName(
  playerId: string,
  players: { userId: string; displayName: string; picture: string }[]
) {
  return players.find((player) => player.userId === playerId)?.displayName || playerId;
}

export function buildActionParts(
  action: string | null,
  players: { userId: string; displayName: string; picture: string }[]
): ActionTextPart[] {
  if (!action) return [];

  const playedMatch = action.match(/^(\S+)\s+(played|stacked)\s+(.+?)(?:\s+\(chose\s+(red|yellow|green|blue)\))?$/i);
  if (playedMatch) {
    const [, playerId, verb, labels, chosenColor] = playedMatch;
    const cardLabels = labels.split(", ");
    const parts: ActionTextPart[] = [
      { text: findPlayerDisplayName(playerId, players), kind: "player" },
      { text: verb, kind: "text" },
    ];

    cardLabels.forEach((label, index) => {
      parts.push(...parseCardLabelParts(label));
      if (index < cardLabels.length - 1) {
        parts.push({ text: ",", kind: "text" });
      }
    });

    if (chosenColor) {
      parts.push({ text: "(chose", kind: "text" });
      parts.push({
        text: chosenColor.charAt(0).toUpperCase() + chosenColor.slice(1).toLowerCase(),
        kind: "color",
        color: chosenColor.toLowerCase() as CardColor,
      });
      parts.push({ text: ")", kind: "text" });
    }

    return parts;
  }

  const caughtMatch = action.match(/^(\S+)\s+caught\s+(\S+)\s+not calling UNO!$/);
  if (caughtMatch) {
    const [, playerId, targetId] = caughtMatch;
    return [
      { text: findPlayerDisplayName(playerId, players), kind: "player" },
      { text: "caught", kind: "text" },
      { text: findPlayerDisplayName(targetId, players), kind: "player" },
      { text: "not calling UNO!", kind: "text" },
    ];
  }

  const genericPlayerMatch = action.match(/^(\S+)\s+(.+)$/);
  if (genericPlayerMatch) {
    const [, playerId, rest] = genericPlayerMatch;
    return [
      { text: findPlayerDisplayName(playerId, players), kind: "player" },
      { text: rest, kind: "text" },
    ];
  }

  return [{ text: action, kind: "text" }];
}
