import type { PlayerView } from "../../shared/gameTypes";

export function getTurnOrderPositions(view: PlayerView): Map<string, number> {
  const positions = new Map<string, number>();
  const total = view.turnOrder.length;
  if (total === 0) return positions;
  const inactive = new Set([...view.finishedPlayers, ...view.eliminatedPlayers]);
  let startSeat = -1;
  for (let step = 0; step < total; step++) {
    const index = ((step * view.direction) % total + total) % total;
    if (!inactive.has(view.turnOrder[index].userId)) {
      startSeat = index;
      break;
    }
  }
  if (startSeat === -1) return positions;
  let position = 1;
  for (let step = 0; step < total; step++) {
    const index = ((startSeat + step * view.direction) % total + total) % total;
    const player = view.turnOrder[index];
    if (inactive.has(player.userId)) continue;
    positions.set(player.userId, position);
    position += 1;
  }
  return positions;
}
