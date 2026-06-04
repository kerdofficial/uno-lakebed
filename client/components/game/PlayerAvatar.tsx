import type { PlayerInfo } from "../../../shared/gameTypes";

const SEAT_COLORS = ["bg-red-700", "bg-blue-700", "bg-green-700", "bg-amber-700"];

type PlayerAvatarProps = {
  player: PlayerInfo;
  isCurrentTurn: boolean;
  small?: boolean;
  seatIndex?: number;
};

export function PlayerAvatar({
  player,
  isCurrentTurn,
  small = false,
  seatIndex = 0,
}: PlayerAvatarProps) {
  const size = small ? "w-8 h-8" : "w-12 h-12";
  const fallbackBg = SEAT_COLORS[seatIndex % SEAT_COLORS.length];

  return (
    <div className="flex flex-col items-center gap-0.5 relative">
      <div
        className={`${size} rounded-full overflow-hidden flex items-center justify-center ${!player.picture ? fallbackBg : "bg-neutral-700"} ${isCurrentTurn ? "border-[3px] border-amber-400" : ""}`}
        style={isCurrentTurn ? { animation: "turn-pulse 2s ease-in-out infinite" } : {}}
      >
        {player.picture ? (
          <img
            src={player.picture}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-white font-bold text-sm">
            {player.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="text-center">
        <div className={`${small ? "text-[10px]" : "text-xs"} text-neutral-300 font-medium`}>
          {player.displayName}
        </div>
      </div>
      {player.calledUno && player.cardCount === 1 && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center"
          style={{ animation: "uno-called-pulse 1.5s ease-in-out infinite" }}
        >
          !
        </div>
      )}
    </div>
  );
}
