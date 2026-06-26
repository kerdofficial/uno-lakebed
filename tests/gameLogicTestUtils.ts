import type {
  Card,
  CardColor,
  CardType,
  GameAction,
  GameMode,
  GameState,
} from "../shared/gameTypes.ts";
import { applyAction } from "../shared/gameLogic/actions.ts";

export function makeCard(
  id: string,
  type: CardType,
  color: CardColor | null,
  value: number | null = null,
): Card {
  return { id, type, color, value };
}

export function makeState(input: {
  gameMode?: GameMode;
  turnOrder: string[];
  currentPlayerIndex?: number;
  topCard?: Card;
  currentColor?: CardColor;
  hands: Record<string, Card[]>;
  drawPile?: Card[];
  phase?: GameState["phase"];
  pendingDrawStack?: number;
  pendingDrawTarget?: string | null;
  finishedPlayers?: string[];
  revivableFinishedPlayers?: string[];
  eliminatedPlayers?: string[];
  placements?: string[];
  winner?: string | null;
  lastAction?: string | null;
  unoCallStatus?: Record<string, boolean>;
  pendingDrawDecision?: GameState["pendingDrawDecision"];
  pendingSevenSwap?: GameState["pendingSevenSwap"];
  publicEvent?: GameState["publicEvent"];
  direction?: 1 | -1;
}): GameState {
  const topCard =
    input.topCard ?? makeCard("top-red-5", "number", "red", 5);

  return {
    gameMode: input.gameMode ?? "regular",
    drawPile: input.drawPile ?? [
      makeCard("draw-1", "number", "red", 1),
      makeCard("draw-2", "number", "yellow", 2),
      makeCard("draw-3", "number", "green", 3),
      makeCard("draw-4", "number", "blue", 4),
      makeCard("draw-5", "number", "red", 6),
      makeCard("draw-6", "number", "yellow", 7),
    ],
    discardPile: [topCard],
    hands: input.hands,
    currentPlayerIndex: input.currentPlayerIndex ?? 0,
    direction: input.direction ?? 1,
    currentColor: input.currentColor ?? (topCard.color as CardColor),
    turnOrder: input.turnOrder,
    phase: input.phase ?? "play",
    pendingDrawStack: input.pendingDrawStack ?? 0,
    pendingDrawTarget: input.pendingDrawTarget ?? null,
    finishedPlayers: input.finishedPlayers ?? [],
    revivableFinishedPlayers: input.revivableFinishedPlayers ?? [],
    eliminatedPlayers: input.eliminatedPlayers ?? [],
    placements: input.placements ?? [],
    winner: input.winner ?? null,
    lastAction: input.lastAction ?? null,
    unoCallStatus: input.unoCallStatus ?? {},
    pendingDrawDecision: input.pendingDrawDecision ?? null,
    pendingSevenSwap: input.pendingSevenSwap ?? null,
    publicEvent: input.publicEvent ?? null,
  };
}

export function step(
  state: GameState,
  playerId: string,
  action: GameAction,
): GameState {
  return applyAction(state, playerId, action);
}
