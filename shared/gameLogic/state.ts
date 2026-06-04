import type { Card, CardColor, GameState } from "../gameTypes";
import { createDeck, shuffleDeck } from "./deck";

export function getNextPlayerIndex(
  state: GameState,
  fromIndex: number,
  skip = 0,
  includeFinished = false
): number {
  const { turnOrder, direction, finishedPlayers } = state;
  let index = fromIndex;
  const totalSteps = skip + 1;

  for (let stepsTaken = 0; stepsTaken < totalSteps;) {
    index = (index + direction + turnOrder.length) % turnOrder.length;
    const playerId = turnOrder[index];
    if (includeFinished || !finishedPlayers.includes(playerId)) {
      stepsTaken++;
    }
  }

  return index;
}

export function getActivePlayerIds(state: GameState): string[] {
  return state.turnOrder.filter((playerId) => !state.finishedPlayers.includes(playerId));
}

function getNextMatchingPlayerIndex(
  state: GameState,
  fromIndex: number,
  canUsePlayer: (playerId: string) => boolean
): number {
  let index = fromIndex;

  for (let offset = 0; offset < state.turnOrder.length; offset++) {
    index = (index + state.direction + state.turnOrder.length) % state.turnOrder.length;
    const playerId = state.turnOrder[index];
    if (canUsePlayer(playerId)) return index;
  }

  return fromIndex;
}

function getNextPlayerIndexAfterSkips(state: GameState, skipCount: number): number {
  if (skipCount <= 0) {
    return getNextPlayerIndex(state, state.currentPlayerIndex);
  }

  const currentPlayerId = state.turnOrder[state.currentPlayerIndex];
  const opponents = getActivePlayerIds(state).filter((playerId) => playerId !== currentPlayerId);
  if (opponents.length === 0) return state.currentPlayerIndex;

  let skippedIndex = state.currentPlayerIndex;
  for (let index = 0; index < skipCount; index++) {
    skippedIndex = getNextMatchingPlayerIndex(
      state,
      skippedIndex,
      (playerId) => playerId !== currentPlayerId && !state.finishedPlayers.includes(playerId)
    );
  }

  return getNextMatchingPlayerIndex(
    state,
    skippedIndex,
    (playerId) => !state.finishedPlayers.includes(playerId)
  );
}

export function advanceTurn(state: GameState, skipCount = 0): GameState {
  return {
    ...state,
    currentPlayerIndex: getNextPlayerIndexAfterSkips(state, skipCount),
  };
}

function rebuildDrawPile(state: GameState): Card[] {
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const unavailableCardIds = new Set<string>();

  if (topDiscard) unavailableCardIds.add(topDiscard.id);

  for (const playerId of state.turnOrder) {
    for (const card of state.hands[playerId] || []) {
      unavailableCardIds.add(card.id);
    }
  }

  return shuffleDeck(createDeck().filter((card) => !unavailableCardIds.has(card.id)));
}

export function ensureDrawPile(state: GameState, needed: number): GameState {
  if (state.drawPile.length >= needed) return state;

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  return {
    ...state,
    drawPile: rebuildDrawPile(state),
    discardPile: [topDiscard],
  };
}

export function drawCards(
  state: GameState,
  count: number
): { state: GameState; drawn: Card[] } {
  const nextState = ensureDrawPile(state, count);
  const available = Math.min(count, nextState.drawPile.length);
  const drawn = nextState.drawPile.slice(0, available);

  return {
    state: { ...nextState, drawPile: nextState.drawPile.slice(available) },
    drawn,
  };
}

export function determineLastDrawType(discardPile: Card[]): "draw2" | "wild4" {
  for (let index = discardPile.length - 1; index >= 0; index--) {
    if (discardPile[index].type === "wild4") return "wild4";
    if (discardPile[index].type === "draw2") return "draw2";
  }
  return "draw2";
}

export function initializeGame(
  playerIds: string[],
  _settings?: { maxPlayers?: number }
): GameState {
  let deck = shuffleDeck(createDeck());
  const hands: Record<string, Card[]> = {};

  for (const playerId of playerIds) {
    hands[playerId] = deck.slice(0, 7);
    deck = deck.slice(7);
  }

  let firstCard = deck[0];
  deck = deck.slice(1);

  for (let attempts = 0; firstCard.type !== "number" && attempts < 108; attempts++) {
    deck = [...deck, firstCard];
    deck = shuffleDeck(deck);
    firstCard = deck[0];
    deck = deck.slice(1);
  }

  if (firstCard.type !== "number") {
    throw new Error("Failed to choose a starting number card");
  }

  return {
    drawPile: deck,
    discardPile: [firstCard],
    hands,
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: firstCard.color as CardColor,
    turnOrder: playerIds,
    phase: "play",
    pendingDrawStack: 0,
    pendingDrawTarget: null,
    finishedPlayers: [],
    winner: null,
    lastAction: null,
    unoCallStatus: {},
    pendingDrawDecision: null,
  };
}
