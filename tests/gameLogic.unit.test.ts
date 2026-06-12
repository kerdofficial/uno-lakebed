import test from "node:test";
import assert from "node:assert/strict";
import { makeCard, makeState, step } from "./gameLogicTestUtils.ts";

test("2-player wild finish can be revived by a +4 on the next turn", () => {
  const arc = "arc";
  const iphone = "iphone";

  let state = makeState({
    turnOrder: [arc, iphone],
    hands: {
      [arc]: [makeCard("arc-wild", "wild", null)],
      [iphone]: [makeCard("iphone-plus4", "wild4", null)],
    },
    drawPile: [
      makeCard("d1", "number", "red", 1),
      makeCard("d2", "number", "yellow", 2),
      makeCard("d3", "number", "green", 3),
      makeCard("d4", "number", "blue", 4),
    ],
  });

  state = step(state, arc, {
    type: "playCards",
    cardIds: ["arc-wild"],
    chosenColor: "blue",
  });

  assert.equal(state.phase, "play");
  assert.deepEqual(state.placements, [arc]);
  assert.equal(state.winner, arc);

  state = step(state, iphone, {
    type: "playCards",
    cardIds: ["iphone-plus4"],
    chosenColor: "red",
  });

  assert.equal(state.phase, "stacking");
  assert.equal(state.pendingDrawTarget, arc);

  state = step(state, arc, { type: "drawCards" });

  assert.equal(state.phase, "play");
  assert.equal(state.winner, iphone);
  assert.deepEqual(state.placements, [iphone]);
  assert.deepEqual(state.finishedPlayers, [iphone]);
  assert.equal(state.hands[arc].length, 4);
});

test("3-player full cycle expires the revival window for the first finisher", () => {
  const dani = "dani";
  const balazs = "balazs";
  const peti = "peti";

  let state = makeState({
    turnOrder: [dani, balazs, peti],
    hands: {
      [dani]: [makeCard("dani-wild", "wild", null)],
      [balazs]: [
        makeCard("balazs-blue-5", "number", "blue", 5),
        makeCard("balazs-plus4", "wild4", null),
      ],
      [peti]: [
        makeCard("peti-blue-7", "number", "blue", 7),
        makeCard("peti-red-9", "number", "red", 9),
      ],
    },
  });

  state = step(state, dani, {
    type: "playCards",
    cardIds: ["dani-wild"],
    chosenColor: "blue",
  });
  state = step(state, balazs, {
    type: "playCards",
    cardIds: ["balazs-blue-5"],
  });
  state = step(state, peti, {
    type: "playCards",
    cardIds: ["peti-blue-7"],
  });

  assert.deepEqual(state.revivableFinishedPlayers, []);
  assert.deepEqual(state.placements, [dani]);
  assert.equal(state.winner, dani);

  state = step(state, balazs, {
    type: "playCards",
    cardIds: ["balazs-plus4"],
    chosenColor: "red",
  });

  assert.equal(state.phase, "stacking");
  assert.equal(state.pendingDrawTarget, peti);
  assert.deepEqual(state.placements, [dani, balazs]);
});

test("corrupted placements are normalized before the next action", () => {
  const arc = "arc";
  const iphone = "iphone";

  const state = makeState({
    turnOrder: [arc, iphone],
    currentPlayerIndex: 1,
    topCard: makeCard("wild-top", "wild", null),
    currentColor: "blue",
    hands: {
      [arc]: [],
      [iphone]: [makeCard("iphone-plus4", "wild4", null)],
    },
    finishedPlayers: [arc],
    revivableFinishedPlayers: [arc],
    placements: [iphone, arc],
    winner: iphone,
    lastAction: "Arc played Wild (chose blue)",
  });

  const next = step(state, iphone, {
    type: "playCards",
    cardIds: ["iphone-plus4"],
    chosenColor: "red",
  });

  assert.equal(next.phase, "stacking");
  assert.equal(next.pendingDrawTarget, arc);
  assert.deepEqual(next.placements, [arc, iphone]);
  assert.equal(next.winner, arc);
});

test("last active player gets the final placement automatically when revival is no longer possible", () => {
  const arc = "arc";
  const iphone = "iphone";

  let state = makeState({
    turnOrder: [arc, iphone],
    hands: {
      [arc]: [makeCard("arc-wild", "wild", null)],
      [iphone]: [
        makeCard("iphone-blue-7", "number", "blue", 7),
        makeCard("iphone-red-9", "number", "red", 9),
      ],
    },
  });

  state = step(state, arc, {
    type: "playCards",
    cardIds: ["arc-wild"],
    chosenColor: "blue",
  });

  state = step(state, iphone, {
    type: "playCards",
    cardIds: ["iphone-blue-7"],
  });

  assert.equal(state.phase, "finished");
  assert.equal(state.winner, arc);
  assert.deepEqual(state.placements, [arc, iphone]);
  assert.equal(state.hands[iphone].length, 1);
});
