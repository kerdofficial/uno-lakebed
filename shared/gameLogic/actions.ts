import type { Card, CardColor, GameAction, GamePhase, GameState } from "../gameTypes";
import { buildActionDescription, cardLabel } from "./descriptions";
import {
  advanceTurn,
  drawCards,
  ensureDrawPile,
  getActivePlayerIds,
  getNextPlayerIndex,
  getPlacements,
  getRevivableFinishedPlayers,
  normalizeGameState,
} from "./state";
import {
  cardNeedsColorChoice,
  getDrawAmount,
  getNumberParity,
  isDrawCard,
  isMatchingRouletteCard,
  makePublicEventId,
} from "./effects";
import { getGameModeConfig } from "./modes";
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

function markPlayerFinished(state: GameState, playerId: string): GameState {
  state = normalizeGameState(state);
  if (state.eliminatedPlayers.includes(playerId)) return state;
  let nextState = state;

  if (!nextState.finishedPlayers.includes(playerId)) {
    nextState = {
      ...nextState,
      finishedPlayers: [...nextState.finishedPlayers, playerId],
      revivableFinishedPlayers: [...getRevivableFinishedPlayers(nextState), playerId],
    };
  }

  if (!getPlacements(nextState).includes(playerId)) {
    nextState = {
      ...nextState,
      placements: [...getPlacements(nextState), playerId],
      winner: nextState.winner || playerId,
    };
  }

  return nextState;
}

function markPlayerEliminated(state: GameState, playerId: string): GameState {
  state = normalizeGameState(state);
  if (state.eliminatedPlayers.includes(playerId)) return state;
  const remainingPlacements = getPlacements(state).filter((id) => id !== playerId);

  return {
    ...state,
    hands: { ...state.hands, [playerId]: [] },
    finishedPlayers: state.finishedPlayers.includes(playerId)
      ? state.finishedPlayers
      : [...state.finishedPlayers, playerId],
    revivableFinishedPlayers: getRevivableFinishedPlayers(state).filter((id) => id !== playerId),
    eliminatedPlayers: [...state.eliminatedPlayers, playerId],
    placements: remainingPlacements,
    winner: remainingPlacements[0] || null,
  };
}

function normalizePlacementState(state: GameState): GameState {
  state = normalizeGameState(state);
  if (state.phase === "finished") return state;
  const validFinishedPlayers = new Set(state.finishedPlayers);
  const eliminatedPlayers =
    state.gameMode === "noMercy" ? new Set(state.eliminatedPlayers) : new Set<string>();
  const placements = getPlacements(state).filter(
    (playerId) => validFinishedPlayers.has(playerId) && !eliminatedPlayers.has(playerId)
  );
  const winner = placements[0] || null;

  if (placements.length === getPlacements(state).length && winner === state.winner) {
    return state;
  }

  return {
    ...state,
    placements,
    winner,
  };
}

function revivePlayer(state: GameState, playerId: string): GameState {
  state = normalizeGameState(state);
  if (state.eliminatedPlayers.includes(playerId)) return state;

  const placements = getPlacements(state).filter((id) => id !== playerId);

  return {
    ...state,
    finishedPlayers: state.finishedPlayers.filter((id) => id !== playerId),
    revivableFinishedPlayers: getRevivableFinishedPlayers(state).filter((id) => id !== playerId),
    placements,
    winner: placements[0] || null,
  };
}

function appendNoMercyFinalPlacements(state: GameState): GameState {
  if (state.gameMode !== "noMercy") return state;

  const activePlayerIds = getActivePlayerIds(state);
  const revivableFinishedPlayers = getRevivableFinishedPlayers(state);
  if (activePlayerIds.length > 1) return state;
  if (activePlayerIds.length === 1 && revivableFinishedPlayers.length > 0) return state;

  let nextState =
    activePlayerIds.length === 0 && revivableFinishedPlayers.length > 0
      ? { ...state, revivableFinishedPlayers: [] }
      : state;
  const eliminatedPlayers = new Set(nextState.eliminatedPlayers);
  const finishedPlayers = new Set(nextState.finishedPlayers);
  const placements = getPlacements(nextState).filter(
    (playerId) => finishedPlayers.has(playerId) && !eliminatedPlayers.has(playerId)
  );

  for (const playerId of activePlayerIds) {
    if (!nextState.finishedPlayers.includes(playerId)) {
      nextState = {
        ...nextState,
        finishedPlayers: [...nextState.finishedPlayers, playerId],
      };
    }
    if (!placements.includes(playerId)) placements.push(playerId);
  }

  for (const playerId of [...nextState.eliminatedPlayers].reverse()) {
    if (!placements.includes(playerId)) placements.push(playerId);
  }

  return {
    ...nextState,
    placements,
    winner: placements[0] || null,
  };
}

function finalizePlacementsIfResolved(state: GameState): GameState {
  state = normalizeGameState(state);

  if (state.gameMode === "noMercy") {
    return appendNoMercyFinalPlacements(state);
  }

  const revivableFinishedPlayers = getRevivableFinishedPlayers(state);
  const activePlayerIds = getActivePlayerIds(state);
  if (activePlayerIds.length === 0) {
    return {
      ...state,
      revivableFinishedPlayers: [],
    };
  }

  if (revivableFinishedPlayers.length > 0) return state;

  if (activePlayerIds.length !== 1) return state;

  const lastPlayerId = activePlayerIds[0];
  if (getPlacements(state).includes(lastPlayerId)) return state;

  return {
    ...state,
    finishedPlayers: [...state.finishedPlayers, lastPlayerId],
    placements: [...getPlacements(state), lastPlayerId],
  };
}

function applyMercyEliminations(state: GameState): GameState {
  state = normalizeGameState(state);
  const mercyLimit = getGameModeConfig(state.gameMode).mercyLimit;
  if (!mercyLimit) return state;

  let nextState = state;
  for (const playerId of state.turnOrder) {
    if (
      !nextState.finishedPlayers.includes(playerId) &&
      (nextState.hands[playerId] || []).length >= mercyLimit
    ) {
      nextState = markPlayerEliminated(nextState, playerId);
    }
  }

  return nextState;
}

function markEmptyNoMercyHands(state: GameState): GameState {
  if (state.gameMode !== "noMercy") return state;

  let nextState = state;
  for (const playerId of state.turnOrder) {
    if (
      !nextState.finishedPlayers.includes(playerId) &&
      (nextState.hands[playerId] || []).length === 0
    ) {
      nextState = markPlayerFinished(nextState, playerId);
    }
  }
  return nextState;
}

function finishState(state: GameState, lastAction?: string): GameState {
  let nextState = finalizePlacementsIfResolved(normalizeGameState(state));
  const winner = checkWinner(nextState);
  if (winner) {
    nextState = {
      ...nextState,
      phase: "finished",
      winner,
      lastAction: lastAction || nextState.lastAction,
    };
  } else if (lastAction) {
    nextState = { ...nextState, lastAction };
  }
  return nextState;
}

function advanceAndFinish(
  state: GameState,
  skipCount: number,
  lastAction: string,
  expireRevivableFinishedPlayersOnAdvance = true
): GameState {
  const advanced = advanceTurn(
    { ...state, phase: "play" as GamePhase },
    skipCount,
    expireRevivableFinishedPlayersOnAdvance
  );
  return finishState(advanced, lastAction);
}

function passHands(state: GameState): GameState {
  const activePlayerIds = getActivePlayerIds(state);
  if (activePlayerIds.length <= 1) return state;

  const nextHands = { ...state.hands };
  for (const playerId of activePlayerIds) {
    const fromIndex = state.turnOrder.indexOf(playerId);
    const targetIndex = getNextPlayerIndex(state, fromIndex);
    const targetId = state.turnOrder[targetIndex];
    nextHands[targetId] = state.hands[playerId] || [];
  }

  return { ...state, hands: nextHands };
}

function swapHands(state: GameState, leftPlayerId: string, rightPlayerId: string): GameState {
  return {
    ...state,
    hands: {
      ...state.hands,
      [leftPlayerId]: state.hands[rightPlayerId] || [],
      [rightPlayerId]: state.hands[leftPlayerId] || [],
    },
  };
}

function getSevenSwapTargets(state: GameState, playerId: string): string[] {
  return getActivePlayerIds(state).filter((targetId) => targetId !== playerId);
}

function discardAllMatchingCards(hand: Card[], playedCard: Card) {
  if (playedCard.type !== "discardAll" || !playedCard.color) {
    return { hand, extraDiscardedCards: [] as Card[] };
  }

  const extraDiscardedCards = hand.filter((card) => card.color === playedCard.color);
  return {
    hand: hand.filter((card) => card.color !== playedCard.color),
    extraDiscardedCards,
  };
}

function applyColorRoulette(
  state: GameState,
  playerId: string,
  chosenColor: CardColor,
  playedCards: Card[]
): GameState {
  let nextState = normalizeGameState(state);
  const targetIndex = getNextPlayerIndex(nextState, nextState.currentPlayerIndex, 0, true);
  const targetId = nextState.turnOrder[targetIndex];
  const drawnCards: Card[] = [];
  let revealedCard: Card | null = null;
  let guard = 0;
  const maxDraws = 180;

  while (!revealedCard && guard < maxDraws) {
    guard++;
    nextState = ensureDrawPile(nextState, 1);
    if (nextState.drawPile.length === 0) break;

    const drawn = nextState.drawPile[0];
    drawnCards.push(drawn);
    nextState = {
      ...nextState,
      drawPile: nextState.drawPile.slice(1),
      hands: {
        ...nextState.hands,
        [targetId]: [...(nextState.hands[targetId] || []), drawn],
      },
    };

    if (isMatchingRouletteCard(drawn, chosenColor)) {
      revealedCard = drawn;
    }
  }

  nextState = {
    ...nextState,
    currentPlayerIndex: targetIndex,
    pendingDrawDecision: null,
    pendingDrawStack: 0,
    pendingDrawTarget: null,
    publicEvent: {
      id: makePublicEventId(nextState, "color-roulette"),
      type: "colorRouletteReveal",
      actorId: playerId,
      targetId,
      chosenColor,
      revealedCard,
      drawnCount: drawnCards.length,
    },
    lastAction: buildActionDescription(playerId, playedCards, chosenColor),
  };

  nextState = applyMercyEliminations(nextState);
  return advanceAndFinish(nextState, 0, nextState.lastAction || "", true);
}

function getSkipCountAfterAction(state: GameState, playedCards: Card[]): { state: GameState; skipCount: number } {
  let nextState = state;
  let skipCount = playedCards.filter((card) => card.type === "skip").length;
  const reverseCount = playedCards.filter((card) => card.type === "reverse").length;
  const skipAllCount = playedCards.filter((card) => card.type === "skipAll").length;
  const activePlayerCount = getActivePlayerIds(nextState).length;

  if (nextState.gameMode === "noMercy" && skipAllCount > 0) {
    skipCount += Math.max(0, activePlayerCount - 1) * skipAllCount;
  }

  if (activePlayerCount === 2 && reverseCount > 0) {
    skipCount += reverseCount;
  } else if (reverseCount > 0 && reverseCount % 2 === 1) {
    nextState = {
      ...nextState,
      direction: (nextState.direction * -1) as 1 | -1,
    };
  }

  return { state: nextState, skipCount };
}

function applyPostPlayHandRules(state: GameState, playerId: string): GameState {
  let nextState = applyMercyEliminations(state);
  if (nextState.gameMode === "noMercy") {
    return markEmptyNoMercyHands(nextState);
  }
  if ((nextState.hands[playerId] || []).length === 0 && !nextState.finishedPlayers.includes(playerId)) {
    nextState = markPlayerFinished(nextState, playerId);
  }
  return nextState;
}

export function applyCards(
  state: GameState,
  playerId: string,
  cardIds: string[],
  chosenColor?: CardColor,
  callUno = false,
  sevenSwapTargetUserId?: string
): GameState {
  state = normalizeGameState(state);
  const { hand, playedCards } = removePlayedCards(state.hands[playerId], cardIds);
  const lastCard = playedCards[playedCards.length - 1];
  const discardAllResult =
    state.gameMode === "noMercy" && playedCards.length === 1
      ? discardAllMatchingCards(hand, lastCard)
      : { hand, extraDiscardedCards: [] as Card[] };
  const nextHand = discardAllResult.hand;
  const discardAdditions = [...discardAllResult.extraDiscardedCards, ...playedCards];
  const currentColor =
    cardNeedsColorChoice(lastCard)
      ? chosenColor || state.currentColor
      : (lastCard.color as CardColor) || state.currentColor;
  const lastAction = buildActionDescription(
    playerId,
    playedCards,
    chosenColor,
    discardAllResult.extraDiscardedCards.length
  );

  let nextState: GameState = {
    ...state,
    hands: { ...state.hands, [playerId]: nextHand },
    discardPile: [...state.discardPile, ...discardAdditions],
    currentColor,
    pendingDrawDecision: null,
    pendingSevenSwap: null,
    publicEvent: null,
    unoCallStatus: {
      ...state.unoCallStatus,
      [playerId]: callUno && nextHand.length === 1,
    },
  };

  if (cardNeedsColorChoice(lastCard) && !chosenColor) {
    return {
      ...nextState,
      phase: "chooseColor",
      lastAction,
    };
  }

  const drawAmount = playedCards.reduce((sum, card) => sum + getDrawAmount(card), 0);
  const hasDrawEffect = playedCards.some((card) => isDrawCard(card, nextState.gameMode));

  if (hasDrawEffect) {
    const activePlayerCountBeforeDraw = getActivePlayerIds(nextState).length;
    nextState = applyPostPlayHandRules(nextState, playerId);

    if (lastCard.type === "wildReverseDraw4") {
      nextState = {
        ...nextState,
        direction: (nextState.direction * -1) as 1 | -1,
      };
    }

    const targetIndex =
      lastCard.type === "wildReverseDraw4" && activePlayerCountBeforeDraw === 2
        ? nextState.currentPlayerIndex
        : getNextPlayerIndex(nextState, nextState.currentPlayerIndex, 0, true);

    return {
      ...nextState,
      phase: "stacking",
      pendingDrawStack: nextState.pendingDrawStack + drawAmount,
      pendingDrawTarget: nextState.turnOrder[targetIndex],
      currentPlayerIndex: targetIndex,
      lastAction,
    };
  }

  if (nextState.gameMode === "noMercy" && lastCard.type === "wildColorRoulette") {
    nextState = applyPostPlayHandRules(nextState, playerId);
    return applyColorRoulette(nextState, playerId, chosenColor || currentColor, playedCards);
  }

  const zeroParity = getNumberParity(playedCards, 0);
  const sevenParity = getNumberParity(playedCards, 7);

  if (nextState.gameMode === "noMercy" && zeroParity === "odd") {
    nextState = passHands(nextState);
    nextState = {
      ...nextState,
      publicEvent: {
        id: makePublicEventId(nextState, "hands-passed"),
        type: "handsPassed",
        actorId: playerId,
      },
    };
  }

  if (nextState.gameMode === "noMercy" && sevenParity === "odd") {
    const targets = getSevenSwapTargets(nextState, playerId);
    if (sevenSwapTargetUserId) {
      if (!targets.includes(sevenSwapTargetUserId)) {
        throw new Error("Invalid hand swap target");
      }
      nextState = swapHands(nextState, playerId, sevenSwapTargetUserId);
      nextState = {
        ...nextState,
        publicEvent: {
          id: makePublicEventId(nextState, "hands-swapped"),
          type: "handsSwapped",
          actorId: playerId,
          targetId: sevenSwapTargetUserId,
        },
      };
    } else if (targets.length > 1) {
      return {
        ...nextState,
        phase: "chooseSevenSwapTarget",
        pendingSevenSwap: {
          playerId,
          cardIds,
        },
        lastAction,
      };
    } else if (targets.length === 1) {
      nextState = swapHands(nextState, playerId, targets[0]);
      nextState = {
        ...nextState,
        publicEvent: {
          id: makePublicEventId(nextState, "hands-swapped"),
          type: "handsSwapped",
          actorId: playerId,
          targetId: targets[0],
        },
      };
    }
  }

  nextState = applyPostPlayHandRules(nextState, playerId);

  const skipResult = getSkipCountAfterAction(nextState, playedCards);
  nextState = skipResult.state;

  return advanceAndFinish(nextState, skipResult.skipCount, lastAction);
}

export function applyStack(
  state: GameState,
  playerId: string,
  cardIds: string[],
  chosenColor?: CardColor,
  callUno = false
): GameState {
  state = normalizeGameState(state);
  const { hand, playedCards } = removePlayedCards(state.hands[playerId], cardIds);
  const lastCard = playedCards[playedCards.length - 1];
  const drawAmount = playedCards.reduce((sum, card) => sum + getDrawAmount(card), 0);

  let nextState: GameState = {
    ...state,
    hands: { ...state.hands, [playerId]: hand },
    discardPile: [...state.discardPile, ...playedCards],
    currentColor:
      cardNeedsColorChoice(lastCard)
        ? chosenColor || state.currentColor
        : lastCard.color || state.currentColor,
    pendingDrawStack: state.pendingDrawStack + drawAmount,
    pendingDrawDecision: null,
    pendingSevenSwap: null,
    publicEvent: null,
    unoCallStatus: {
      ...state.unoCallStatus,
      [playerId]: callUno && hand.length === 1,
    },
  };

  nextState = applyPostPlayHandRules(nextState, playerId);

  if (lastCard.type === "wildReverseDraw4") {
    nextState = {
      ...nextState,
      direction: (nextState.direction * -1) as 1 | -1,
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
  state = normalizeGameState(state);
  const topCard = state.discardPile[state.discardPile.length - 1];
  let nextState: GameState = {
    ...state,
    currentColor: chosenColor,
    pendingDrawDecision: null,
    publicEvent: null,
    lastAction: state.lastAction
      ? `${state.lastAction} (chose ${chosenColor})`
      : `${playerId} chose ${chosenColor}`,
  };

  if (topCard.type === "wildColorRoulette") {
    return applyColorRoulette(nextState, playerId, chosenColor, [topCard]);
  }

  if (topCard.type === "wildReverseDraw4") {
    nextState = {
      ...nextState,
      direction: (nextState.direction * -1) as 1 | -1,
    };
  }

  if (isDrawCard(topCard, nextState.gameMode)) {
    const activePlayerCount = getActivePlayerIds(nextState).length;
    const targetIndex =
      topCard.type === "wildReverseDraw4" && activePlayerCount === 2
        ? nextState.currentPlayerIndex
        : getNextPlayerIndex(nextState, nextState.currentPlayerIndex, 0, true);
    return {
      ...nextState,
      phase: "stacking",
      pendingDrawStack: nextState.pendingDrawStack + getDrawAmount(topCard),
      pendingDrawTarget: nextState.turnOrder[targetIndex],
      currentPlayerIndex: targetIndex,
    };
  }

  return advanceAndFinish({ ...nextState, phase: "play" }, 0, nextState.lastAction || "");
}

export function applyDraw(state: GameState, playerId: string): GameState {
  state = normalizeGameState(state);
  const { state: nextState, drawn } = drawCards(state, state.pendingDrawStack);
  let result: GameState = {
    ...revivePlayer(nextState, playerId),
    hands: { ...nextState.hands, [playerId]: [...(nextState.hands[playerId] || []), ...drawn] },
    pendingDrawStack: 0,
    pendingDrawTarget: null,
    pendingDrawDecision: null,
    pendingSevenSwap: null,
    publicEvent: null,
    phase: "play" as GamePhase,
    lastAction: `${playerId} drew ${state.pendingDrawStack} cards`,
  };

  result = applyMercyEliminations(result);
  return advanceAndFinish(result, 0, result.lastAction || "", false);
}

export function applyNormalDraw(state: GameState, playerId: string): GameState {
  state = normalizeGameState(state);
  const { state: nextState, drawn } = drawCards(state, 1);

  if (drawn.length === 0) {
    return advanceAndFinish(
      { ...nextState, pendingDrawDecision: null, publicEvent: null },
      0,
      `${playerId} could not draw`
    );
  }

  const drawnCard = drawn[0];
  const hand = [...nextState.hands[playerId], drawnCard];
  let stateWithDrawn: GameState = {
    ...nextState,
    hands: { ...nextState.hands, [playerId]: hand },
    unoCallStatus: { ...nextState.unoCallStatus, [playerId]: false },
    pendingDrawDecision: null,
    pendingSevenSwap: null,
    publicEvent: null,
  };

  stateWithDrawn = applyMercyEliminations(stateWithDrawn);
  if (stateWithDrawn.finishedPlayers.includes(playerId)) {
    return advanceAndFinish(stateWithDrawn, 0, `${playerId} drew a card`);
  }

  if (
    isCardPlayable(
      drawnCard,
      state.discardPile[state.discardPile.length - 1],
      state.currentColor,
      state.gameMode
    )
  ) {
    return {
      ...stateWithDrawn,
      pendingDrawDecision: {
        playerId,
        cardId: drawnCard.id,
      },
      lastAction: `${playerId} drew a playable card`,
    };
  }

  return advanceAndFinish(stateWithDrawn, 0, `${playerId} drew a card`);
}

function applySevenSwapTarget(
  state: GameState,
  playerId: string,
  targetUserId: string
): GameState {
  state = normalizeGameState(state);
  let nextState = swapHands(state, playerId, targetUserId);
  nextState = {
    ...nextState,
    pendingSevenSwap: null,
    phase: "play",
    publicEvent: {
      id: makePublicEventId(nextState, "hands-swapped"),
      type: "handsSwapped",
      actorId: playerId,
      targetId: targetUserId,
    },
  };
  nextState = applyPostPlayHandRules(nextState, playerId);
  return advanceAndFinish(nextState, 0, `${playerId} swapped hands with ${targetUserId}`);
}

export function applyAction(
  state: GameState,
  playerId: string,
  action: GameAction
): GameState {
  state = normalizePlacementState(state);
  const validation = validateAction(state, playerId, action);
  if (!validation.valid) throw new Error(validation.error);

  switch (action.type) {
    case "playCards":
      return applyCards(
        state,
        playerId,
        action.cardIds,
        action.chosenColor,
        !!action.callUno,
        action.sevenSwapTargetUserId
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
    case "chooseSevenSwapTarget":
      return applySevenSwapTarget(state, playerId, action.targetUserId);
    case "callUno":
      return {
        ...state,
        unoCallStatus: { ...state.unoCallStatus, [playerId]: true },
      };
    case "catchUno": {
      const { state: nextState, drawn } = drawCards(state, 2);
      let result: GameState = {
        ...nextState,
        hands: {
          ...nextState.hands,
          [action.targetUserId]: [...(nextState.hands[action.targetUserId] || []), ...drawn],
        },
        publicEvent: null,
        lastAction: `${playerId} caught ${action.targetUserId} not calling UNO!`,
      };
      result = applyMercyEliminations(result);
      return finishState(result, result.lastAction || "");
    }
    case "resolveDrawDecision": {
      if (action.decision === "keep") {
        return advanceAndFinish(
          {
            ...state,
            pendingDrawDecision: null,
            publicEvent: null,
          },
          0,
          `${playerId} kept the drawn card`
        );
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
