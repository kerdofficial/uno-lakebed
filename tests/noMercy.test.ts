import test from "node:test";
import assert from "node:assert/strict";
import { computePlayerView } from "../shared/gameLogic/playerView.ts";
import { createNoMercyDeck, createRegularDeck } from "../shared/gameLogic/decks.ts";
import { getRemainingHandCountAfterPlay } from "../shared/gameLogic/effects.ts";
import { buildActionParts } from "../shared/gameLogic/descriptions.ts";
import { makeCard, makeState, step } from "./gameLogicTestUtils.ts";

function countByType(deck: ReturnType<typeof createNoMercyDeck>) {
  return deck.reduce<Record<string, number>>((counts, card) => {
    counts[card.type] = (counts[card.type] || 0) + 1;
    return counts;
  }, {});
}

test("regular and no mercy decks have the expected card counts", () => {
  const regularDeck = createRegularDeck();
  const noMercyDeck = createNoMercyDeck();
  const counts = countByType(noMercyDeck);

  assert.equal(regularDeck.length, 108);
  assert.equal(noMercyDeck.length, 168);

  for (const color of ["red", "yellow", "green", "blue"]) {
    assert.equal(noMercyDeck.filter((card) => card.color === color).length, 36);
  }

  assert.equal(noMercyDeck.filter((card) => card.color === null).length, 24);
  assert.equal(counts.number, 80);
  assert.equal(counts.skip, 12);
  assert.equal(counts.skipAll, 8);
  assert.equal(counts.reverse, 12);
  assert.equal(counts.draw2, 12);
  assert.equal(counts.draw4, 8);
  assert.equal(counts.discardAll, 12);
  assert.equal(counts.wildReverseDraw4, 8);
  assert.equal(counts.wildDraw6, 4);
  assert.equal(counts.wildDraw10, 4);
  assert.equal(counts.wildColorRoulette, 8);
});

test("no mercy stacking requires an equal or higher draw card", () => {
  const dani = "dani";
  const balazs = "balazs";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [dani, balazs],
    hands: {
      [dani]: [makeCard("dani-plus6", "wildDraw6", null)],
      [balazs]: [
        makeCard("balazs-plus4", "draw4", "red"),
        makeCard("balazs-plus10", "wildDraw10", null),
      ],
    },
  });

  state = step(state, dani, {
    type: "playCards",
    cardIds: ["dani-plus6"],
    chosenColor: "red",
  });

  assert.equal(state.phase, "stacking");
  assert.equal(state.pendingDrawStack, 6);
  assert.throws(() =>
    step(state, balazs, {
      type: "stackCards",
      cardIds: ["balazs-plus4"],
    })
  );

  state = step(state, balazs, {
    type: "stackCards",
    cardIds: ["balazs-plus10"],
    chosenColor: "blue",
  });

  assert.equal(state.pendingDrawStack, 16);
  assert.equal(state.pendingDrawTarget, dani);
});

test("no mercy wild reverse draw four targets the player who used it with two players", () => {
  const dani = "dani";
  const balazs = "balazs";

  const state = step(
    makeState({
      gameMode: "noMercy",
      turnOrder: [dani, balazs],
      hands: {
        [dani]: [makeCard("dani-rev4", "wildReverseDraw4", null)],
        [balazs]: [makeCard("balazs-red-5", "number", "red", 5)],
      },
    }),
    dani,
    {
      type: "playCards",
      cardIds: ["dani-rev4"],
      chosenColor: "red",
    }
  );

  assert.equal(state.phase, "stacking");
  assert.equal(state.direction, -1);
  assert.equal(state.pendingDrawTarget, dani);
});

test("no mercy discard all removes matching color cards and keeps discard all on top", () => {
  const dani = "dani";
  const balazs = "balazs";

  const state = step(
    makeState({
      gameMode: "noMercy",
      turnOrder: [dani, balazs],
      hands: {
        [dani]: [
          makeCard("drop-red", "discardAll", "red"),
          makeCard("red-1", "number", "red", 1),
          makeCard("red-skip", "skip", "red"),
          makeCard("blue-3", "number", "blue", 3),
        ],
        [balazs]: [makeCard("balazs-red-2", "number", "red", 2)],
      },
    }),
    dani,
    {
      type: "playCards",
      cardIds: ["drop-red"],
    }
  );

  assert.deepEqual(state.hands[dani].map((card) => card.id), ["blue-3"]);
  assert.equal(state.discardPile[state.discardPile.length - 1].id, "drop-red");
  assert.equal(state.currentColor, "red");
});

test("no mercy seven and zero parity rules swap or pass only on odd counts", () => {
  const dani = "dani";
  const balazs = "balazs";
  const peti = "peti";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [dani, balazs, peti],
    hands: {
      [dani]: [
        makeCard("dani-7-red", "number", "red", 7),
        makeCard("dani-7-blue", "number", "blue", 7),
        makeCard("dani-0-red", "number", "red", 0),
      ],
      [balazs]: [makeCard("balazs-1", "number", "red", 1)],
      [peti]: [makeCard("peti-2", "number", "red", 2)],
    },
  });

  state = step(state, dani, {
    type: "playCards",
    cardIds: ["dani-7-red", "dani-7-blue"],
  });

  assert.equal(state.phase, "play");
  assert.deepEqual(state.hands[dani].map((card) => card.id), ["dani-0-red"]);

  state = {
    ...state,
    currentPlayerIndex: 0,
    currentColor: "red",
    finishedPlayers: [],
    revivableFinishedPlayers: [],
    placements: [],
    winner: null,
    hands: {
      [dani]: [makeCard("dani-7-red-2", "number", "red", 7)],
      [balazs]: [makeCard("balazs-1", "number", "red", 1)],
      [peti]: [makeCard("peti-2", "number", "red", 2)],
    },
  };

  state = step(state, dani, {
    type: "playCards",
    cardIds: ["dani-7-red-2"],
  });

  assert.equal(state.phase, "chooseSevenSwapTarget");

  state = step(state, dani, {
    type: "chooseSevenSwapTarget",
    targetUserId: peti,
  });

  assert.deepEqual(state.hands[dani].map((card) => card.id), ["peti-2"]);

  state = makeState({
    gameMode: "noMercy",
    turnOrder: [dani, balazs, peti],
    hands: {
      [dani]: [makeCard("dani-0", "number", "red", 0), makeCard("dani-9", "number", "blue", 9)],
      [balazs]: [makeCard("balazs-1", "number", "red", 1)],
      [peti]: [makeCard("peti-2", "number", "red", 2)],
    },
  });

  state = step(state, dani, {
    type: "playCards",
    cardIds: ["dani-0"],
  });

  assert.deepEqual(state.hands[balazs].map((card) => card.id), ["dani-9"]);
  assert.deepEqual(state.hands[peti].map((card) => card.id), ["balazs-1"]);
});

test("no mercy eliminates players at 30 cards and finishes when one player remains", () => {
  const dani = "dani";
  const balazs = "balazs";
  const bigHand = Array.from({ length: 29 }, (_, index) =>
    makeCard(`balazs-${index}`, "number", "blue", index % 10)
  );

  const state = step(
    makeState({
      gameMode: "noMercy",
      turnOrder: [dani, balazs],
      currentPlayerIndex: 1,
      hands: {
        [dani]: [makeCard("dani-red-1", "number", "red", 1)],
        [balazs]: bigHand,
      },
      drawPile: [makeCard("draw-red-1", "number", "red", 1)],
    }),
    balazs,
    { type: "drawCards" }
  );

  assert.deepEqual(state.eliminatedPlayers, [balazs]);
  assert.equal(state.phase, "finished");
  assert.equal(state.winner, dani);
});

test("no mercy eliminated player is placed last after remaining players finish", () => {
  const x = "x";
  const y = "y";
  const z = "z";
  const bigHand = Array.from({ length: 29 }, (_, index) =>
    makeCard(`z-${index}`, "number", "blue", index % 10)
  );

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y, z],
    currentPlayerIndex: 2,
    hands: {
      [x]: [makeCard("x-red-1", "number", "red", 1), makeCard("x-red-2", "number", "red", 2)],
      [y]: [makeCard("y-red-1", "number", "red", 1)],
      [z]: bigHand,
    },
    drawPile: [makeCard("draw-red-1", "number", "red", 1)],
  });

  state = step(state, z, { type: "drawCards" });
  assert.deepEqual(state.eliminatedPlayers, [z]);
  assert.deepEqual(state.placements, []);

  state = step(state, x, {
    type: "playCards",
    cardIds: ["x-red-1"],
  });
  state = step(state, y, {
    type: "playCards",
    cardIds: ["y-red-1"],
  });
  state = step(state, x, {
    type: "playCards",
    cardIds: ["x-red-2"],
  });

  assert.equal(state.phase, "finished");
  assert.equal(state.winner, y);
  assert.deepEqual(state.placements, [y, x, z]);
});

test("no mercy corrupted eliminated placement is repaired before resolving winner", () => {
  const x = "x";
  const y = "y";
  const z = "z";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y, z],
    currentPlayerIndex: 0,
    hands: {
      [x]: [makeCard("x-red-1", "number", "red", 1)],
      [y]: [makeCard("y-red-1", "number", "red", 1), makeCard("y-red-2", "number", "red", 2)],
      [z]: [],
    },
    finishedPlayers: [z],
    eliminatedPlayers: [z],
    placements: [z],
    winner: z,
  });

  state = step(state, x, {
    type: "playCards",
    cardIds: ["x-red-1"],
  });
  state = step(state, y, {
    type: "playCards",
    cardIds: ["y-red-1"],
  });

  assert.equal(state.phase, "finished");
  assert.equal(state.winner, x);
  assert.deepEqual(state.placements, [x, y, z]);
});

test("no mercy empty hand finisher remains winner", () => {
  const x = "x";
  const y = "y";
  const z = "z";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y, z],
    currentPlayerIndex: 2,
    hands: {
      [x]: [makeCard("x-red-1", "number", "red", 1), makeCard("x-red-2", "number", "red", 2)],
      [y]: [makeCard("y-red-1", "number", "red", 1)],
      [z]: [makeCard("z-red-1", "number", "red", 1)],
    },
  });

  state = step(state, z, {
    type: "playCards",
    cardIds: ["z-red-1"],
  });
  state = step(state, x, {
    type: "playCards",
    cardIds: ["x-red-1"],
  });
  state = step(state, y, {
    type: "playCards",
    cardIds: ["y-red-1"],
  });
  state = step(state, x, {
    type: "playCards",
    cardIds: ["x-red-2"],
  });

  assert.equal(state.phase, "finished");
  assert.equal(state.winner, z);
  assert.deepEqual(state.placements, [z, y, x]);
});

test("no mercy color roulette reveals only the final matching card", () => {
  const dani = "dani";
  const balazs = "balazs";

  const state = step(
    makeState({
      gameMode: "noMercy",
      turnOrder: [dani, balazs],
      hands: {
        [dani]: [
          makeCard("roulette", "wildColorRoulette", null),
          makeCard("dani-red-9", "number", "red", 9),
        ],
        [balazs]: [makeCard("balazs-blue-5", "number", "blue", 5)],
      },
      drawPile: [
        makeCard("draw-wild", "wildDraw6", null),
        makeCard("draw-blue", "number", "blue", 2),
        makeCard("draw-red", "number", "red", 4),
      ],
    }),
    dani,
    {
      type: "playCards",
      cardIds: ["roulette"],
      chosenColor: "red",
    }
  );

  assert.equal(state.publicEvent?.type, "colorRouletteReveal");
  assert.equal(state.publicEvent?.revealedCard?.id, "draw-red");
  assert.equal(state.publicEvent?.drawnCount, 3);
  assert.equal(state.hands[balazs].length, 4);
});

test("player view exposes public events and seven swap targets safely", () => {
  const dani = "dani";
  const balazs = "balazs";
  const peti = "peti";
  const state = makeState({
    gameMode: "noMercy",
    turnOrder: [dani, balazs, peti],
    phase: "chooseSevenSwapTarget",
    pendingSevenSwap: { playerId: dani, cardIds: ["seven"] },
    hands: {
      [dani]: [makeCard("dani-1", "number", "red", 1)],
      [balazs]: [makeCard("balazs-1", "number", "red", 1)],
      [peti]: [makeCard("peti-1", "number", "red", 1)],
    },
    publicEvent: {
      id: "event-1",
      type: "colorRouletteReveal",
      actorId: dani,
      targetId: balazs,
      chosenColor: "red",
      revealedCard: makeCard("red-1", "number", "red", 1),
      drawnCount: 2,
    },
  });

  const view = computePlayerView(state, dani, "game-1", [
    { userId: dani, displayName: "Dani", picture: "" },
    { userId: balazs, displayName: "Balazs", picture: "" },
    { userId: peti, displayName: "Peti", picture: "" },
  ]);

  assert.equal(view.publicEvent?.id, "event-1");
  assert.deepEqual(view.pendingSevenSwapTargets.map((target) => target.userId), [balazs, peti]);
});

test("player view only exposes spectator hands to players who cannot be revived", () => {
  const dani = "dani";
  const balazs = "balazs";
  const peti = "peti";
  const players = [
    { userId: dani, displayName: "Dani", picture: "" },
    { userId: balazs, displayName: "Balazs", picture: "" },
    { userId: peti, displayName: "Peti", picture: "" },
  ];
  const state = makeState({
    gameMode: "noMercy",
    turnOrder: [dani, balazs, peti],
    hands: {
      [dani]: [],
      [balazs]: [makeCard("balazs-1", "number", "red", 1)],
      [peti]: [makeCard("peti-1", "number", "red", 1), makeCard("peti-2", "number", "blue", 2)],
    },
    finishedPlayers: [dani],
    revivableFinishedPlayers: [],
    placements: [dani],
    winner: dani,
  });

  const spectatorView = computePlayerView(state, dani, "game-1", players);
  assert.deepEqual(Object.keys(spectatorView.spectatorHands).sort(), [balazs, peti].sort());
  assert.deepEqual(spectatorView.spectatorHands[balazs].map((card) => card.id), ["balazs-1"]);

  const activeView = computePlayerView(state, balazs, "game-1", players);
  assert.deepEqual(activeView.spectatorHands, {});

  const revivableView = computePlayerView(
    { ...state, revivableFinishedPlayers: [dani] },
    dani,
    "game-1",
    players
  );
  assert.deepEqual(revivableView.spectatorHands, {});

  const eliminatedView = computePlayerView(
    { ...state, finishedPlayers: [dani, peti], eliminatedPlayers: [peti], hands: { ...state.hands, [peti]: [] } },
    peti,
    "game-1",
    players
  );
  assert.deepEqual(Object.keys(eliminatedView.spectatorHands), [balazs]);
});

test("no mercy hand actions publish pass and swap events", () => {
  const dani = "dani";
  const balazs = "balazs";
  const peti = "peti";

  let state = step(
    makeState({
      gameMode: "noMercy",
      turnOrder: [dani, balazs, peti],
      hands: {
        [dani]: [makeCard("dani-0", "number", "red", 0), makeCard("dani-9", "number", "blue", 9)],
        [balazs]: [makeCard("balazs-1", "number", "red", 1)],
        [peti]: [makeCard("peti-2", "number", "red", 2)],
      },
    }),
    dani,
    {
      type: "playCards",
      cardIds: ["dani-0"],
    }
  );

  assert.equal(state.publicEvent?.type, "handsPassed");
  assert.equal(state.publicEvent?.actorId, dani);

  state = step(
    makeState({
      gameMode: "noMercy",
      turnOrder: [dani, balazs, peti],
      hands: {
        [dani]: [makeCard("dani-7", "number", "red", 7)],
        [balazs]: [makeCard("balazs-1", "number", "red", 1)],
        [peti]: [makeCard("peti-2", "number", "red", 2)],
      },
    }),
    dani,
    {
      type: "playCards",
      cardIds: ["dani-7"],
      sevenSwapTargetUserId: peti,
    }
  );

  assert.equal(state.publicEvent?.type, "handsSwapped");
  assert.equal(state.publicEvent?.actorId, dani);
  assert.equal(state.publicEvent?.targetId, peti);

  const view = computePlayerView(state, balazs, "game-1", [
    { userId: dani, displayName: "Dani", picture: "" },
    { userId: balazs, displayName: "Balazs", picture: "" },
    { userId: peti, displayName: "Peti", picture: "" },
  ]);
  assert.equal(view.publicEvent?.type, "handsSwapped");
  assert.equal(view.turnOrder.find((player) => player.userId === view.publicEvent?.actorId)?.displayName, "Dani");
  assert.equal(view.turnOrder.find((player) => player.userId === view.publicEvent?.targetId)?.displayName, "Peti");
});

test("no mercy places later-eliminated players ahead of earlier-eliminated players", () => {
  const a = "a", b = "b", c = "c", d = "d";
  const bigHand = (prefix: string) =>
    Array.from({ length: 29 }, (_, i) => makeCard(`${prefix}-${i}`, "number", "blue", i % 10));

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [a, b, c, d],
    currentPlayerIndex: 2,
    hands: {
      [a]: [makeCard("a-red-1", "number", "red", 1), makeCard("a-red-2", "number", "red", 2)],
      [b]: [makeCard("b-red-1", "number", "red", 3)],
      [c]: bigHand("c"),
      [d]: bigHand("d"),
    },
  });

  state = step(state, c, { type: "drawCards" });
  assert.deepEqual(state.eliminatedPlayers, [c]);
  state = step(state, d, { type: "drawCards" });
  assert.deepEqual(state.eliminatedPlayers, [c, d]);

  state = step(state, a, { type: "playCards", cardIds: ["a-red-1"] });
  state = step(state, b, { type: "playCards", cardIds: ["b-red-1"] });
  state = step(state, a, { type: "playCards", cardIds: ["a-red-2"] });

  assert.equal(state.phase, "finished");
  assert.equal(state.winner, b);
  assert.deepEqual(state.placements, [b, a, d, c]);
});

test("no mercy crowns the longest-surviving player when everyone is eliminated", () => {
  const a = "a", b = "b";
  const hand = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => makeCard(`${prefix}-${i}`, "number", "blue", i % 10));

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [a, b],
    currentPlayerIndex: 1,
    hands: { [a]: hand("a", 30), [b]: hand("b", 29) },
    drawPile: [makeCard("draw-red-1", "number", "red", 1)],
  });

  state = step(state, b, { type: "drawCards" });

  assert.deepEqual(state.eliminatedPlayers, [a, b]);
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.placements, [b, a]);
  assert.equal(state.winner, b);
});

test("no mercy finished placements survive post-game actions", () => {
  const x = "x", y = "y", z = "z";
  const state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y, z],
    phase: "finished",
    hands: { [x]: [], [y]: [], [z]: [] },
    finishedPlayers: [y, x, z],
    eliminatedPlayers: [z],
    placements: [y, x, z],
    winner: y,
  });

  const next = step(state, x, { type: "callUno" });

  assert.deepEqual(next.placements, [y, x, z]);
  assert.equal(next.winner, y);
});

test("remaining hand count after play accounts for discard all extras", () => {
  const hand = [
    makeCard("drop-red", "discardAll", "red"),
    makeCard("red-1", "number", "red", 1),
    makeCard("red-skip", "skip", "red"),
    makeCard("blue-3", "number", "blue", 3),
  ];

  assert.equal(getRemainingHandCountAfterPlay(hand, ["drop-red"], "noMercy"), 1);
  assert.equal(getRemainingHandCountAfterPlay(hand, ["drop-red"], "regular"), 3);
  assert.equal(getRemainingHandCountAfterPlay(hand, ["red-1"], "noMercy"), 3);
  assert.equal(getRemainingHandCountAfterPlay(hand, ["red-1", "blue-3"], "noMercy"), 2);
});

test("no mercy discard all play arms UNO when the discard leaves one card", () => {
  const dani = "dani";
  const balazs = "balazs";

  const state = step(
    makeState({
      gameMode: "noMercy",
      turnOrder: [dani, balazs],
      hands: {
        [dani]: [
          makeCard("drop-red", "discardAll", "red"),
          makeCard("red-1", "number", "red", 1),
          makeCard("blue-3", "number", "blue", 3),
        ],
        [balazs]: [makeCard("balazs-red-2", "number", "red", 2)],
      },
    }),
    dani,
    { type: "playCards", cardIds: ["drop-red"], callUno: true }
  );

  assert.deepEqual(state.hands[dani].map((card) => card.id), ["blue-3"]);
  assert.equal(state.unoCallStatus[dani], true);

  const view = computePlayerView(state, balazs, "game-1", [
    { userId: dani, displayName: "Dani", picture: "" },
    { userId: balazs, displayName: "Balazs", picture: "" },
  ]);
  assert.equal(view.turnOrder.find((player) => player.userId === dani)?.calledUno, true);
  assert.deepEqual(view.unoCatchable, []);
});

test("no mercy wild reverse draw four reverses before targeting with three active players", () => {
  const x = "x";
  const y = "y";
  const z = "z";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y, z],
    currentPlayerIndex: 1,
    hands: {
      [x]: [makeCard("x-red-1", "number", "red", 1), makeCard("x-red-2", "number", "red", 2)],
      [y]: [makeCard("y-rev4", "wildReverseDraw4", null), makeCard("y-blue-3", "number", "blue", 3)],
      [z]: [makeCard("z-red-9", "number", "red", 9)],
    },
  });

  state = step(state, y, { type: "playCards", cardIds: ["y-rev4"], chosenColor: "red" });

  assert.equal(state.phase, "stacking");
  assert.equal(state.direction, -1);
  assert.equal(state.pendingDrawTarget, x);
  assert.equal(state.pendingDrawStack, 4);

  state = step(state, x, { type: "drawCards" });

  assert.equal(state.phase, "play");
  assert.equal(state.hands[x].length, 6);
  assert.equal(state.turnOrder[state.currentPlayerIndex], z);
});

test("no mercy wild reverse draw four self-targets when only two players remain active", () => {
  const x = "x";
  const y = "y";
  const z = "z";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y, z],
    currentPlayerIndex: 1,
    finishedPlayers: [z],
    hands: {
      [x]: [makeCard("x-blue-3", "number", "blue", 3)],
      [y]: [makeCard("y-rev4", "wildReverseDraw4", null), makeCard("y-blue-8", "number", "blue", 8)],
      [z]: [],
    },
  });

  state = step(state, y, { type: "playCards", cardIds: ["y-rev4"], chosenColor: "blue" });

  assert.equal(state.phase, "stacking");
  assert.equal(state.direction, -1);
  assert.equal(state.pendingDrawTarget, y);
  assert.equal(state.turnOrder[state.currentPlayerIndex], y);

  state = step(state, y, { type: "drawCards" });

  assert.equal(state.phase, "play");
  assert.equal(state.hands[y].length, 5);
  assert.equal(state.turnOrder[state.currentPlayerIndex], x);
});

test("no mercy self-targeted reverse draw four chain passes to the opponent when stacked on", () => {
  const x = "x";
  const y = "y";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y],
    currentPlayerIndex: 1,
    hands: {
      [x]: [makeCard("x-blue-3", "number", "blue", 3)],
      [y]: [
        makeCard("y-rev4", "wildReverseDraw4", null),
        makeCard("y-plus6", "wildDraw6", null),
        makeCard("y-green-2", "number", "green", 2),
      ],
    },
    drawPile: Array.from({ length: 10 }, (_, index) =>
      makeCard(`pile-${index}`, "number", "blue", (index % 6) + 1)
    ),
  });

  state = step(state, y, { type: "playCards", cardIds: ["y-rev4"], chosenColor: "red" });
  assert.equal(state.pendingDrawTarget, y);
  assert.equal(state.direction, -1);

  state = step(state, y, { type: "stackCards", cardIds: ["y-plus6"], chosenColor: "blue" });
  assert.equal(state.pendingDrawTarget, x);
  assert.equal(state.pendingDrawStack, 10);
  assert.equal(state.turnOrder[state.currentPlayerIndex], x);

  state = step(state, x, { type: "drawCards" });
  assert.equal(state.phase, "play");
  assert.equal(state.hands[x].length, 11);
  assert.equal(state.turnOrder[state.currentPlayerIndex], y);
});

test("no mercy stacked reverse draw four flips the chain back to the opponent", () => {
  const x = "x";
  const y = "y";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y],
    currentPlayerIndex: 1,
    hands: {
      [x]: [makeCard("x-rev4", "wildReverseDraw4", null), makeCard("x-green-2", "number", "green", 2)],
      [y]: [makeCard("y-plus4", "draw4", "red"), makeCard("y-green-9", "number", "green", 9)],
    },
    drawPile: Array.from({ length: 8 }, (_, index) =>
      makeCard(`pile-${index}`, "number", "blue", (index % 6) + 1)
    ),
  });

  state = step(state, y, { type: "playCards", cardIds: ["y-plus4"] });
  assert.equal(state.pendingDrawTarget, x);
  assert.equal(state.direction, 1);
  assert.equal(state.pendingDrawStack, 4);

  state = step(state, x, { type: "stackCards", cardIds: ["x-rev4"], chosenColor: "blue" });
  assert.equal(state.direction, -1);
  assert.equal(state.pendingDrawTarget, y);
  assert.equal(state.pendingDrawStack, 8);

  state = step(state, y, { type: "drawCards" });
  assert.equal(state.hands[y].length, 9);
  assert.equal(state.turnOrder[state.currentPlayerIndex], x);
});

test("no mercy wild reverse draw four played from a draw decision self-targets with two players", () => {
  const x = "x";
  const y = "y";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y],
    currentPlayerIndex: 1,
    hands: {
      [x]: [makeCard("x-blue-3", "number", "blue", 3)],
      [y]: [makeCard("y-green-9", "number", "green", 9)],
    },
    drawPile: [makeCard("drawn-rev4", "wildReverseDraw4", null)],
  });

  state = step(state, y, { type: "drawCards" });
  assert.equal(state.pendingDrawDecision?.playerId, y);
  assert.equal(state.pendingDrawDecision?.cardId, "drawn-rev4");

  state = step(state, y, {
    type: "resolveDrawDecision",
    decision: "play",
    chosenColor: "red",
    callUno: true,
  });

  assert.equal(state.phase, "stacking");
  assert.equal(state.direction, -1);
  assert.equal(state.pendingDrawTarget, y);
  assert.equal(state.pendingDrawStack, 4);
  assert.equal(state.unoCallStatus[y], true);
});

test("no mercy allows multi-playing skip all cards and returns to the same player", () => {
  const x = "x";
  const y = "y";
  const z = "z";

  let state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y, z],
    hands: {
      [x]: [
        makeCard("x-skipall-red", "skipAll", "red"),
        makeCard("x-skipall-blue", "skipAll", "blue"),
        makeCard("x-blue-3", "number", "blue", 3),
      ],
      [y]: [makeCard("y-red-1", "number", "red", 1)],
      [z]: [makeCard("z-red-2", "number", "red", 2)],
    },
  });

  state = step(state, x, {
    type: "playCards",
    cardIds: ["x-skipall-red", "x-skipall-blue"],
  });

  assert.equal(state.phase, "play");
  assert.equal(state.turnOrder[state.currentPlayerIndex], x);
  assert.equal(state.currentColor, "blue");
  assert.deepEqual(state.hands[x].map((card) => card.id), ["x-blue-3"]);
});

test("no mercy rejects mixing skip all with other card types", () => {
  const x = "x";
  const y = "y";

  const state = makeState({
    gameMode: "noMercy",
    turnOrder: [x, y],
    hands: {
      [x]: [
        makeCard("x-skipall-red", "skipAll", "red"),
        makeCard("x-skip-red", "skip", "red"),
        makeCard("x-blue-3", "number", "blue", 3),
      ],
      [y]: [makeCard("y-red-1", "number", "red", 1)],
    },
  });

  assert.throws(() =>
    step(state, x, {
      type: "playCards",
      cardIds: ["x-skipall-red", "x-skip-red"],
    })
  );
});

test("no mercy discard all reports the total discarded count", () => {
  const dani = "dani";
  const balazs = "balazs";

  const state = step(
    makeState({
      gameMode: "noMercy",
      turnOrder: [dani, balazs],
      hands: {
        [dani]: [
          makeCard("drop-red", "discardAll", "red"),
          makeCard("red-1", "number", "red", 1),
          makeCard("red-skip", "skip", "red"),
          makeCard("blue-3", "number", "blue", 3),
        ],
        [balazs]: [makeCard("balazs-red-2", "number", "red", 2)],
      },
    }),
    dani,
    { type: "playCards", cardIds: ["drop-red"] }
  );

  assert.equal(state.lastAction, "dani played Red Discard All, discarding 3 cards");
});

test("action parts render the discard all count as plain text", () => {
  const parts = buildActionParts("dani played Red Discard All, discarding 3 cards", [
    { userId: "dani", displayName: "Dani", picture: "" },
  ]);

  assert.deepEqual(parts, [
    { text: "Dani", kind: "player" },
    { text: "played", kind: "text" },
    { text: "Red", kind: "color", color: "red" },
    { text: "Discard All", kind: "card" },
    { text: ",", kind: "text" },
    { text: "discarding 3 cards", kind: "text" },
  ]);
});
