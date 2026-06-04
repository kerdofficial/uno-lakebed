import type { Card, CardColor, GameAction, GamePhase, GameState } from "../gameTypes";
import { buildActionDescription, cardLabel } from "./descriptions";
import { advanceTurn, determineLastDrawType, drawCards, getActivePlayerIds, getNextPlayerIndex } from "./state";
import { checkWinner, isCardPlayable } from "./rules";
import { validateAction } from "./playerView";

function removePlayedCards(hand: Card[], cardIds: string[]) {
  const nextHand = [...hand];
  const playedCards: Card[] = [];

  for (const cardId of cardIds) {
    const cardIndex = nextHand.findIndex((card) => card.id === cardId);
    if (cardIndex === -1) throw new Error(`Card ${cardId} not in hand`);
    playedCards.push(nextHand[cardIndex]);
    nextHand.splice(cardIndex, 1);
  }

  return { hand: nextHand, playedCards };
}

export function applyCards(
  state: GameState,
  playerId: string,
  cardIds: string[],
  chosenColor?: CardColor,
  callUno = false
): GameState {
  const { hand, playedCards } = removePlayedCards(state.hands[playerId], cardIds);
  const lastCard = playedCards[playedCards.length - 1];
  const currentColor =
    lastCard.type === "wild" || lastCard.type === "wild4"
      ? chosenColor || state.currentColor
      : (lastCard.color as CardColor);

  let nextState: GameState = {
    ...state,
    hands: { ...state.hands, [playerId]: hand },
    discardPile: [...state.discardPile, ...playedCards],
    currentColor,
    pendingDrawDecision: null,
    unoCallStatus: {
      ...state.unoCallStatus,
      [playerId]: callUno && hand.length === 1,
    },
  };

  if (hand.length === 0 && !nextState.finishedPlayers.includes(playerId)) {
    nextState = {
      ...nextState,
      finishedPlayers: [...nextState.finishedPlayers, playerId],
    };
  }

  if ((lastCard.type === "wild" || lastCard.type === "wild4") && !chosenColor) {
    return {
      ...nextState,
      phase: "chooseColor",
      lastAction: buildActionDescription(playerId, playedCards),
    };
  }

  const hasDrawEffect = playedCards.some((card) => card.type === "draw2" || card.type === "wild4");
  const drawAmount = playedCards.reduce((sum, card) => {
    if (card.type === "draw2") return sum + 2;
    if (card.type === "wild4") return sum + 4;
    return sum;
  }, 0);

  if (hasDrawEffect) {
    const targetIndex = getNextPlayerIndex(nextState, nextState.currentPlayerIndex, 0, true);
    return {
      ...nextState,
      phase: "stacking",
      pendingDrawStack: nextState.pendingDrawStack + drawAmount,
      pendingDrawTarget: nextState.turnOrder[targetIndex],
      currentPlayerIndex: targetIndex,
      lastAction: buildActionDescription(playerId, playedCards, chosenColor),
    };
  }

  let skipCount = playedCards.filter((card) => card.type === "skip").length;
  const reverseCount = playedCards.filter((card) => card.type === "reverse").length;
  const activePlayerCount = getActivePlayerIds(nextState).length;

  if (activePlayerCount === 2 && reverseCount > 0) {
    skipCount += reverseCount;
  } else if (reverseCount > 0 && reverseCount % 2 === 1) {
    nextState = {
      ...nextState,
      direction: (nextState.direction * -1) as 1 | -1,
    };
  }

  nextState = advanceTurn(nextState, skipCount);

  const winner = checkWinner(nextState);
  if (winner) {
    return {
      ...nextState,
      phase: "finished",
      winner,
      lastAction: buildActionDescription(playerId, playedCards, chosenColor),
    };
  }

  return {
    ...nextState,
    phase: "play",
    lastAction: buildActionDescription(playerId, playedCards, chosenColor),
  };
}

export function applyStack(
  state: GameState,
  playerId: string,
  cardIds: string[],
  chosenColor?: CardColor,
  callUno = false
): GameState {
  const { hand, playedCards } = removePlayedCards(state.hands[playerId], cardIds);
  const lastCard = playedCards[playedCards.length - 1];
  const drawAmount = playedCards.reduce((sum, card) => {
    if (card.type === "draw2") return sum + 2;
    if (card.type === "wild4") return sum + 4;
    return sum;
  }, 0);

  let nextState: GameState = {
    ...state,
    hands: { ...state.hands, [playerId]: hand },
    discardPile: [...state.discardPile, ...playedCards],
    currentColor:
      lastCard.type === "wild4"
        ? chosenColor || state.currentColor
        : lastCard.color || state.currentColor,
    pendingDrawStack: state.pendingDrawStack + drawAmount,
    pendingDrawDecision: null,
    unoCallStatus: {
      ...state.unoCallStatus,
      [playerId]: callUno && hand.length === 1,
    },
  };

  if (hand.length === 0 && !nextState.finishedPlayers.includes(playerId)) {
    nextState = {
      ...nextState,
      finishedPlayers: [...nextState.finishedPlayers, playerId],
    };
  }

  const targetIndex = getNextPlayerIndex(nextState, state.currentPlayerIndex, 0, true);
  return {
    ...nextState,
    pendingDrawTarget: nextState.turnOrder[targetIndex],
    currentPlayerIndex: targetIndex,
    lastAction: `${playerId} stacked ${playedCards.map(cardLabel).join(", ")}`,
  };
}

export function applyChosenColor(
  state: GameState,
  playerId: string,
  chosenColor: CardColor
): GameState {
  const topCard = state.discardPile[state.discardPile.length - 1];
  let nextState: GameState = {
    ...state,
    currentColor: chosenColor,
    pendingDrawDecision: null,
    lastAction: state.lastAction
      ? `${state.lastAction} (chose ${chosenColor})`
      : `${playerId} chose ${chosenColor}`,
  };

  if (topCard.type === "wild4") {
    const targetIndex = getNextPlayerIndex(nextState, nextState.currentPlayerIndex, 0, true);
    return {
      ...nextState,
      phase: "stacking",
      pendingDrawStack: nextState.pendingDrawStack + 4,
      pendingDrawTarget: nextState.turnOrder[targetIndex],
      currentPlayerIndex: targetIndex,
    };
  }

  nextState = advanceTurn({ ...nextState, phase: "play" }, 0);
  const winner = checkWinner(nextState);
  return winner ? { ...nextState, phase: "finished", winner } : nextState;
}

export function applyDraw(state: GameState, playerId: string): GameState {
  const { state: nextState, drawn } = drawCards(state, state.pendingDrawStack);
  let result: GameState = {
    ...nextState,
    hands: { ...nextState.hands, [playerId]: [...(nextState.hands[playerId] || []), ...drawn] },
    finishedPlayers: nextState.finishedPlayers.filter((id) => id !== playerId),
    pendingDrawStack: 0,
    pendingDrawTarget: null,
    pendingDrawDecision: null,
    phase: "play" as GamePhase,
    lastAction: `${playerId} drew ${state.pendingDrawStack} cards`,
  };

  result = advanceTurn(result, 0);
  const winner = checkWinner(result);
  return winner ? { ...result, phase: "finished", winner } : result;
}

export function applyNormalDraw(state: GameState, playerId: string): GameState {
  const { state: nextState, drawn } = drawCards(state, 1);

  if (drawn.length === 0) {
    return {
      ...advanceTurn({ ...nextState, pendingDrawDecision: null }, 0),
      lastAction: `${playerId} could not draw`,
    };
  }

  const drawnCard = drawn[0];
  const hand = [...nextState.hands[playerId], drawnCard];
  const stateWithDrawn: GameState = {
    ...nextState,
    hands: { ...nextState.hands, [playerId]: hand },
    unoCallStatus: { ...nextState.unoCallStatus, [playerId]: false },
    pendingDrawDecision: null,
  };

  if (isCardPlayable(drawnCard, state.discardPile[state.discardPile.length - 1], state.currentColor)) {
    return {
      ...stateWithDrawn,
      pendingDrawDecision: {
        playerId,
        cardId: drawnCard.id,
      },
      lastAction: `${playerId} drew a playable card`,
    };
  }

  const result = advanceTurn(stateWithDrawn, 0);
  const winner = checkWinner(result);
  if (winner) {
    return { ...result, phase: "finished", winner };
  }

  return {
    ...result,
    lastAction: `${playerId} drew a card`,
  };
}

export function applyAction(
  state: GameState,
  playerId: string,
  action: GameAction
): GameState {
  const validation = validateAction(state, playerId, action);
  if (!validation.valid) throw new Error(validation.error);

  switch (action.type) {
    case "playCards":
      return applyCards(
        state,
        playerId,
        action.cardIds,
        action.chosenColor,
        !!action.callUno
      );
    case "stackCards":
      return applyStack(
        state,
        playerId,
        action.cardIds,
        action.chosenColor,
        !!action.callUno
      );
    case "drawCards":
      if (state.phase === "stacking" && state.pendingDrawTarget === playerId) {
        return applyDraw(state, playerId);
      }
      return applyNormalDraw(state, playerId);
    case "chooseColor":
      return applyChosenColor(state, playerId, action.chosenColor);
    case "callUno":
      return {
        ...state,
        unoCallStatus: { ...state.unoCallStatus, [playerId]: true },
      };
    case "catchUno": {
      const { state: nextState, drawn } = drawCards(state, 2);
      return {
        ...nextState,
        hands: {
          ...nextState.hands,
          [action.targetUserId]: [...(nextState.hands[action.targetUserId] || []), ...drawn],
        },
        lastAction: `${playerId} caught ${action.targetUserId} not calling UNO!`,
      };
    }
    case "resolveDrawDecision": {
      if (action.decision === "keep") {
        return {
          ...advanceTurn(
            {
              ...state,
              pendingDrawDecision: null,
            },
            0
          ),
          lastAction: `${playerId} kept the drawn card`,
        };
      }

      return applyCards(
        {
          ...state,
          pendingDrawDecision: null,
        },
        playerId,
        [state.pendingDrawDecision!.cardId],
        action.chosenColor,
        !!action.callUno
      );
    }
  }
}
