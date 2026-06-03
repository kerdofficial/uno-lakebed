import type { PlayerView } from "../../../shared/gameTypes";
import { UnoCard } from "../cards/UnoCard";
import { PlayerAvatar } from "./PlayerAvatar";

type OpponentBarProps = {
  view: PlayerView;
  myUserId: string;
};

export function OpponentBar({ view, myUserId }: OpponentBarProps) {
  const opponents = view.turnOrder.filter((player) => player.userId !== myUserId);

  return (
    <div className="flex justify-center gap-4 md:gap-6 py-2">
      {opponents.map((player) => (
        <div key={player.userId} className="flex flex-col items-center gap-1">
          <PlayerAvatar
            player={player}
            isCurrentTurn={view.turnOrder[view.currentPlayerIndex]?.userId === player.userId}
          />
          <div className="flex -space-x-3">
            {Array.from({ length: Math.min(player.cardCount, 7) }).map((_, index) => (
              <UnoCard
                key={index}
                card={{ id: "", color: null, type: "wild", value: null }}
                faceDown
                small
              />
            ))}
            {player.cardCount > 7 && (
              <div className="w-[40px] h-[60px] flex items-center justify-center text-neutral-400 text-xs">
                +{player.cardCount - 7}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
