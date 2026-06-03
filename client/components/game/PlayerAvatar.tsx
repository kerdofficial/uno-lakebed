import type { PlayerInfo } from "../../../shared/gameTypes";

type PlayerAvatarProps = {
  player: PlayerInfo;
  isCurrentTurn: boolean;
  small?: boolean;
};

export function PlayerAvatar({
  player,
  isCurrentTurn,
  small = false,
}: PlayerAvatarProps) {
  const size = small ? "w-8 h-8" : "w-10 h-10";
  const ring = isCurrentTurn ? "ring-2 ring-yellow-400" : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${size} rounded-full ${ring} overflow-hidden bg-neutral-700 flex items-center justify-center`}>
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
        <div className={`${small ? "text-[10px]" : "text-xs"} text-neutral-300 truncate max-w-[60px]`}>
          {player.displayName}
        </div>
        <div className={`${small ? "text-[9px]" : "text-[10px]"} text-neutral-500`}>
          {player.cardCount} cards
        </div>
        {player.calledUno && player.cardCount === 1 && (
          <div className="text-[9px] text-red-400 font-bold">UNO!</div>
        )}
      </div>
    </div>
  );
}
