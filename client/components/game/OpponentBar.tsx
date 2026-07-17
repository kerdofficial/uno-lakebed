import type { PlayerView } from "../../../shared/gameTypes";
import { getTurnOrderPositions } from "../../utils/turnOrderPositions";
import { UnoCard } from "../cards/UnoCard";
import { PlayerAvatar } from "./PlayerAvatar";

type OpponentBarProps = {
  view: PlayerView;
  myUserId: string;
  catchableUserIds: string[];
};

export function OpponentBar({ view, myUserId, catchableUserIds }: OpponentBarProps) {
  const opponents = view.turnOrder.filter((player) => player.userId !== myUserId);
  const positions = getTurnOrderPositions(view);

  return (
    <div className="flex justify-center gap-6 md:gap-8 py-3">
      {opponents.map((player) => {
        const isCurrentTurn = view.turnOrder[view.currentPlayerIndex]?.userId === player.userId;
        const isCatchable = catchableUserIds.includes(player.userId);
        const seatIndex = view.turnOrder.findIndex((p) => p.userId === player.userId);

        return (
          <div
            key={player.userId}
            className={[
              "flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-colors",
              isCurrentTurn ? "bg-amber-400/5" : "",
              isCatchable ? "border border-orange-500/60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={isCatchable ? { "--glow-color": "rgba(249, 115, 22, 0.4)", animation: "glow-pulse 1.5s ease-in-out infinite" } as any : undefined}
          >
            <PlayerAvatar
              player={player}
              isCurrentTurn={isCurrentTurn}
              seatIndex={seatIndex}
              orderNumber={positions.get(player.userId) ?? null}
            />
            <div className="relative flex items-center justify-center">
              <div className="flex -space-x-4 opacity-40">
                <UnoCard
                  card={{ id: "", color: null, type: "wild", value: null }}
                  faceDown
                  size="small"
                />
                {player.cardCount > 1 && (
                  <UnoCard
                    card={{ id: "", color: null, type: "wild", value: null }}
                    faceDown
                    size="small"
                  />
                )}
              </div>
              <div className="absolute bg-neutral-800/80 text-white font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center">
                {player.cardCount}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
