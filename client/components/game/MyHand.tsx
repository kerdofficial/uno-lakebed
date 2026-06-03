import type { Card, PlayerView } from "../../../shared/gameTypes";
import { UnoCard } from "../cards/UnoCard";

type MyHandProps = {
  view: PlayerView;
  selectedCards: Set<string>;
  onToggleCard: (id: string) => void;
  onPlaySelected: () => void;
};

function canToggleCard(view: PlayerView, selectedCards: Set<string>, card: Card) {
  if (selectedCards.has(card.id)) return true;

  const playableSet = new Set([...view.playableCardIds, ...view.stackableCardIds]);
  const selectedHandCards = Array.from(selectedCards)
    .map((id) => view.myHand.find((handCard) => handCard.id === id))
    .filter(Boolean) as Card[];

  if (selectedHandCards.length === 0) return playableSet.has(card.id);
  if (view.canStack) return playableSet.has(card.id);

  const first = selectedHandCards[0];
  if (first.type === "number" && card.type === "number") {
    return first.value === card.value;
  }
  if (first.type === "skip" || first.type === "reverse") {
    return card.type === first.type;
  }
  return false;
}

export function MyHand({
  view,
  selectedCards,
  onToggleCard,
  onPlaySelected,
}: MyHandProps) {
  const overlapPx = Math.max(20, 46 - view.myHand.length * 2);

  return (
    <div className="flex flex-col items-center gap-2 pb-4 relative">
      {selectedCards.size > 0 && (
        <button
          onClick={onPlaySelected}
          className="px-4 py-1.5 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-200 transition-colors absolute -top-8"
        >
          Play {selectedCards.size} card{selectedCards.size > 1 ? "s" : ""}
        </button>
      )}
      <div
        className="flex justify-center items-end overflow-x-auto max-w-full px-2 py-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {view.myHand.map((card, index) => {
          const isPlayable = canToggleCard(view, selectedCards, card);
          const isSelected = selectedCards.has(card.id);
          const marginLeft = index === 0 ? 0 : -overlapPx;

          return (
            <div
              key={card.id}
              style={{
                marginLeft: `${marginLeft}px`,
                zIndex: isSelected ? 50 : index,
                scrollSnapAlign: "center",
              }}
            >
              <UnoCard
                card={card}
                playable={isPlayable}
                selected={isSelected}
                onClick={() => isPlayable && onToggleCard(card.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
