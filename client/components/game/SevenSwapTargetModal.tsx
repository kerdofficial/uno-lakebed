import type { PlayerInfo } from "../../../shared/gameTypes";

type SevenSwapTargetModalProps = {
  targets: PlayerInfo[];
  onChoose: (targetUserId: string) => void;
  onCancel?: () => void;
};

export function SevenSwapTargetModal({ targets, onChoose, onCancel }: SevenSwapTargetModalProps) {
  if (targets.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-2xl"
        style={{ animation: "bounce-in 0.3s ease-out" }}
      >
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-300">
            7's Swap
          </p>
          <h3 className="mt-2 text-xl font-black text-white">
            Choose a hand
          </h3>
        </div>
        <div className="mt-5 space-y-2">
          {targets.map((target) => (
            <button
              key={target.userId}
              onClick={() => onChoose(target.userId)}
              className="flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-left transition-all hover:border-red-400/70 hover:bg-neutral-800 active:scale-[0.99] cursor-pointer"
            >
              <span className="min-w-0 truncate text-sm font-bold text-white">
                {target.displayName}
              </span>
              <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-bold text-red-300">
                {target.cardCount} cards
              </span>
            </button>
          ))}
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 w-full rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 active:scale-[0.98] cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
