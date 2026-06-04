import type { Card } from "../../../shared/gameTypes";
import { UnoCard } from "../cards/UnoCard";

type DrawDecisionModalProps = {
  card: Card;
  canCallUno: boolean;
  unoArmed: boolean;
  onToggleUnoArmed: () => void;
  onKeep: () => void;
  onPlay: () => void;
};

export function DrawDecisionModal({
  card,
  canCallUno,
  unoArmed,
  onToggleUnoArmed,
  onKeep,
  onPlay,
}: DrawDecisionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-neutral-900 p-6 text-center shadow-2xl"
        style={{ animation: "bounce-in 0.3s ease-out" }}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Drawn card
        </p>
        <h3 className="mt-2 text-xl font-black text-white">
          Play it now?
        </h3>
        <p className="mt-2 text-sm text-neutral-400">
          The drawn card can be played. Keep it in hand or play it now?
        </p>
        <div className="mt-5 flex justify-center">
          <UnoCard card={card} size="normal" playable={true} hoverable={false} />
        </div>
        {canCallUno && (
          <button
            onClick={onToggleUnoArmed}
            className={`mt-5 rounded-full px-4 py-2 text-sm font-black transition-colors cursor-pointer ${
              unoArmed
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {unoArmed ? "UNO armed" : "Call UNO"}
          </button>
        )}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onKeep}
            className="flex-1 rounded-full bg-white/10 px-4 py-3 text-sm font-bold text-white transition-colors cursor-pointer hover:bg-white/20"
          >
            Keep in hand
          </button>
          <button
            onClick={onPlay}
            className="flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-bold text-white transition-colors cursor-pointer hover:bg-red-700"
          >
            Play now
          </button>
        </div>
      </div>
    </div>
  );
}
