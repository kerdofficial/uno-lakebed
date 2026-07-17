import { useEffect, useState } from "preact/hooks";
import type { PlayerView } from "../../../shared/gameTypes";
import { UnoCard } from "../cards/UnoCard";

export function SpectatorPanel({ view }: { view: PlayerView }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const entries = view.turnOrder.filter((p) => p.userId in view.spectatorHands);
  const active = entries.find((p) => p.userId === selectedUserId) ?? entries[0];

  useEffect(() => {
    if (selectedUserId && !(selectedUserId in view.spectatorHands)) {
      setSelectedUserId(null);
    }
  }, [selectedUserId, view.spectatorHands]);

  if (entries.length === 0 || !active) return null;

  return (
    <div className="flex flex-col gap-2 px-3 pb-4 pt-2">
      <div className="text-center text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">
        Spectating
      </div>
      <div className="flex justify-center gap-2 overflow-x-auto px-1">
        {entries.map((p) => (
          <button
            key={p.userId}
            onClick={() => setSelectedUserId(p.userId)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors active:scale-[0.98] cursor-pointer ${
              p.userId === active.userId
                ? "bg-neutral-800 text-white"
                : "bg-neutral-900/60 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span className="max-w-[96px] truncate">{p.displayName}</span>
            <span className="rounded-full bg-neutral-800/80 px-1.5 py-0.5 text-[10px] text-neutral-300">
              {view.spectatorHands[p.userId].length}
            </span>
          </button>
        ))}
      </div>
      <div className="flex justify-center overflow-x-auto pb-1">
        <div className="flex w-fit px-3 -space-x-3">
          {(view.spectatorHands[active.userId] || []).map((card) => (
            <UnoCard key={card.id} card={card} size="small" playable hoverable={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
