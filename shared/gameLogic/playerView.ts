import type { GameAction, GameState, PlayerInfo, PlayerView } from "../gameTypes";
import { actionWithDisplayNames } from "./descriptions";
import { determineLastDrawType } from "./state";
import { getPlayableCards, getStackableCards } from "./rules";

export function computePlayerView(
  state: GameState,
  userId: string,
  gameId: string,
  players: { userId: string; displayName: string; picture: string }[]
): PlayerView {
  const myHand = state.hands[userId] || [];
  const discardTop = state.discardPile[state.discardPile.length - 1];
  const handCounts: Record<string, number> = {};

  for (const playerId of state.turnOrder) {
    if (playerId !== userId) {
      handCounts[playerId] = (state.hands[playerId] || []).length;
    }
  }

  const isMyTurn = state.turnOrder[state.currentPlayerIndex] === userId;
  const canPlay = isMyTurn && state.phase === "play";
  const playableCardIds = canPlay
    ? getPlayableCards(myHand, discardTop, state.currentColor).map((card) => card.id)
    : [];

  const canStack = state.phase === "stacking" && state.pendingDrawTarget === userId;
  const stackableCardIds = canStack
    ? getStackableCards(myHand, determineLastDrawType(state.discardPile)).map((card) => card.id)
    : [];

  const mustDraw =
    (canStack && stackableCardIds.length === 0) ||
    (canPlay && playableCardIds.length === 0);
  const unoCallable = isMyTurn && myHand.length === 2 && state.phase === "play";
  const unoCatchable = state.turnOrder.filter((playerId) => {
    if (playerId === userId) return false;
    const hand = state.hands[playerId] || [];
    return hand.length === 1 && !state.unoCallStatus[playerId];
  });

  const turnOrder: PlayerInfo[] = state.turnOrder.map((playerId) => {
    const player = players.find((entry) => entry.userId === playerId);
    return {
      userId: playerId,
      displayName: player?.displayName || "Unknown",
      picture: player?.picture || "",
      cardCount: (state.hands[playerId] || []).length,
      calledUno: !!state.unoCallStatus[playerId],
    };
  });

  return {
    gameId,
    myHand,
    handCounts,
    discardTop,
    currentColor: state.currentColor,
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    turnOrder,
    phase: state.phase,
    lastAction: actionWithDisplayNames(state.lastAction, players),
    canPlay,
    playableCardIds,
    canStack,
    stackableCardIds,
    mustDraw,
    pendingDrawCount: state.pendingDrawStack,
    unoCallable,
    unoCatchable,
    drawPileCount: state.drawPile.length,
    winner: state.winner,
    finishedPlayers: state.finishedPlayers,
  };
}

export function validateAction(
  state: GameState,
  playerId: string,
  action: GameAction
): { valid: boolean; error?: string } {
  const currentPlayerId = state.turnOrder[state.currentPlayerIndex];

  switch (action.type) {
    case "playCards": {
      if (currentPlayerId !== playerId) return { valid: false, error: "Not your turn" };
      if (state.phase !== "play") return { valid: false, error: "Cannot play cards now" };
      if (action.cardIds.length === 0) return { valid: false, error: "No cards selected" };

      const hand = state.hands[playerId];
      for (const cardId of action.cardIds) {
        if (!hand.find((card) => card.id === cardId)) {
          return { valid: false, error: `Card ${cardId} not in hand` };
        }
      }

      const cards = action.cardIds.map((cardId) => hand.find((card) => card.id === cardId)!);
      const topDiscard = state.discardPile[state.discardPile.length - 1];
      const firstCard = cards[0];
      const sameType = new Set(cards.map((card) => card.type));

      if (cards.length === 1) {
        if (!getPlayableCards([firstCard], topDiscard, state.currentColor).length) {
          return { valid: false, error: "Card not playable" };
        }
      } else {
        if (!getPlayableCards([firstCard], topDiscard, state.currentColor).length) {
          return { valid: false, error: "First card must be playable" };
        }
        if (sameType.size > 1) {
          return { valid: false, error: "Multi-play cards must be same type" };
        }
        if (firstCard.type === "number") {
          const sameValue = new Set(cards.map((card) => card.value));
          if (sameValue.size > 1) {
            return {
              valid: false,
              error: "Multi-play number cards must have same value",
            };
          }
        } else if (firstCard.type !== "skip" && firstCard.type !== "reverse") {
          return {
            valid: false,
            error: "Can only multi-play numbers, skips, or reverses",
          };
        }
      }

      const needsColor = cards.some((card) => card.type === "wild" || card.type === "wild4");
      if (needsColor && !action.chosenColor) {
        return { valid: false, error: "Must choose color for wild card" };
      }

      return { valid: true };
    }

    case "stackCards": {
      if (state.phase !== "stacking") return { valid: false, error: "Not in stacking phase" };
      if (state.pendingDrawTarget !== playerId) {
        return { valid: false, error: "Not the stack target" };
      }
      if (action.cardIds.length === 0) return { valid: false, error: "No cards selected" };

      const hand = state.hands[playerId];
      for (const cardId of action.cardIds) {
        if (!hand.find((card) => card.id === cardId)) {
          return { valid: false, error: `Card ${cardId} not in hand` };
        }
      }

      const cards = action.cardIds.map((cardId) => hand.find((card) => card.id === cardId)!);
      const lastDrawType = determineLastDrawType(state.discardPile);

      for (const card of cards) {
        if (lastDrawType === "draw2") {
          if (card.type !== "draw2" && card.type !== "wild4") {
            return { valid: false, error: "Can only stack +2 or +4 on +2" };
          }
        } else if (card.type !== "wild4") {
          return { valid: false, error: "Can only stack +4 on +4" };
        }
      }

      return { valid: true };
    }

    case "drawCards":
      if (state.phase === "stacking" && state.pendingDrawTarget === playerId) {
        return { valid: true };
      }
      if (state.phase === "play" && currentPlayerId === playerId) {
        return { valid: true };
      }
      return { valid: false, error: "Cannot draw now" };

    case "chooseColor": {
      if (state.phase !== "chooseColor") return { valid: false, error: "Cannot choose color now" };
      if (currentPlayerId !== playerId) return { valid: false, error: "Not your turn" };

      const topCard = state.discardPile[state.discardPile.length - 1];
      if (topCard.type !== "wild" && topCard.type !== "wild4") {
        return { valid: false, error: "Top card is not wild" };
      }

      return { valid: true };
    }

    case "callUno": {
      const hand = state.hands[playerId];
      if (!hand || hand.length > 2) {
        return { valid: false, error: "Can only call UNO with 1-2 cards" };
      }
      return { valid: true };
    }

    case "catchUno": {
      const targetHand = state.hands[action.targetUserId];
      if (!targetHand || targetHand.length !== 1) {
        return { valid: false, error: "Target does not have exactly 1 card" };
      }
      if (state.unoCallStatus[action.targetUserId]) {
        return { valid: false, error: "Target already called UNO" };
      }
      return { valid: true };
    }
  }
}
