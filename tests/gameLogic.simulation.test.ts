import test from "node:test";
import assert from "node:assert/strict";
import { makeCard, makeState, step } from "./gameLogicTestUtils.ts";

test("simulation: 3-player finish, revive, then a different player becomes the winner", () => {
  const arc = "arc";
  const iphone = "iphone";
  const mac = "mac";

  let state = makeState({
    turnOrder: [arc, iphone, mac],
    hands: {
      [arc]: [makeCard("arc-wild", "wild", null)],
      [iphone]: [
        makeCard("iphone-blue-8", "number", "blue", 8),
        makeCard("iphone-red-1", "number", "red", 1),
      ],
      [mac]: [makeCard("mac-plus4", "wild4", null)],
    },
    drawPile: [
      makeCard("draw-a", "number", "red", 1),
      makeCard("draw-b", "number", "yellow", 2),
      makeCard("draw-c", "number", "green", 3),
      makeCard("draw-d", "number", "blue", 4),
      makeCard("draw-e", "number", "red", 5),
      makeCard("draw-f", "number", "yellow", 6),
    ],
  });

  state = step(state, arc, {
    type: "playCards",
    cardIds: ["arc-wild"],
    chosenColor: "blue",
  });
  assert.deepEqual(state.placements, [arc]);

  state = step(state, iphone, {
    type: "playCards",
    cardIds: ["iphone-blue-8"],
  });
  assert.deepEqual(state.revivableFinishedPlayers, [arc]);

  state = step(state, mac, {
    type: "playCards",
    cardIds: ["mac-plus4"],
    chosenColor: "red",
  });
  assert.equal(state.pendingDrawTarget, arc);

  state = step(state, arc, { type: "drawCards" });
  assert.equal(state.winner, mac);
  assert.deepEqual(state.placements, [mac]);
  assert.deepEqual(state.revivableFinishedPlayers, [mac]);
  assert.equal(state.hands[arc].length, 4);
});

test("simulation: 2-player finish with no revive opportunity auto-closes the round", () => {
  const arc = "arc";
  const iphone = "iphone";

  let state = makeState({
    turnOrder: [arc, iphone],
    hands: {
      [arc]: [makeCard("arc-wild", "wild", null)],
      [iphone]: [makeCard("iphone-blue-7", "number", "blue", 7)],
    },
  });

  state = step(state, arc, {
    type: "playCards",
    cardIds: ["arc-wild"],
    chosenColor: "blue",
  });

  assert.equal(state.phase, "play");
  assert.deepEqual(state.placements, [arc]);

  state = step(state, iphone, {
    type: "playCards",
    cardIds: ["iphone-blue-7"],
  });

  assert.equal(state.phase, "finished");
  assert.equal(state.winner, arc);
  assert.deepEqual(state.placements, [arc, iphone]);
});
