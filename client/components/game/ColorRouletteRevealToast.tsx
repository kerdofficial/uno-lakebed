import type { PlayerView } from "../../../shared/gameTypes";
import { CARD_GLOW_SHADOW } from "../../utils/cardUi";
import { UnoCard } from "../cards/UnoCard";

type ColorRouletteRevealToastProps = {
  view: PlayerView;
};

export function ColorRouletteRevealToast({ view }: ColorRouletteRevealToastProps) {
  const event = view.publicEvent;
  if (!event || event.type !== "colorRouletteReveal") return null;

  const actor = view.turnOrder.find((player) => player.userId === event.actorId);
  const target = view.turnOrder.find((player) => player.userId === event.targetId);
  const glow = CARD_GLOW_SHADOW[event.chosenColor] || "";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
      <div
        className="flex max-w-sm items-center gap-4 rounded-2xl border border-white/10 bg-neutral-950/95 p-4 shadow-2xl backdrop-blur"
        style={{ animation: "fade-slide-in 0.25s ease-out", boxShadow: glow }}
      >
        {event.revealedCard ? (
          <UnoCard card={event.revealedCard} size="small" playable={true} hoverable={false} />
        ) : (
          <div className="flex h-[54px] w-[36px] items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-[9px] font-black text-neutral-500">
            NONE
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-white">
            Color Roulette
          </div>
          <div className="mt-1 text-sm text-neutral-300">
            {actor?.displayName || "Player"} picked {event.chosenColor}. {target?.displayName || "Next player"} drew {event.drawnCount}.
          </div>
        </div>
      </div>
    </div>
  );
}
