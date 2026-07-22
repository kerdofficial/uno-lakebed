import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { RefObject } from "preact";
import type { Card, PlayerView } from "../../../shared/gameTypes";
import { getRemainingHandCountAfterPlay } from "../../../shared/gameLogic/effects";
import { UnoCard } from "../cards/UnoCard";

type MyHandProps = {
  view: PlayerView;
  selectedCards: Set<string>;
  unoArmed: boolean;
  onToggleCard: (id: string) => void;
  onToggleUnoArmed: () => void;
  onPlaySelected: () => void;
  onClearSelection: () => void;
  onSelectAll: (cardIds: string[]) => void;
  colorPickerVisible: boolean;
  myOrderNumber?: number | null;
};

// Max tilt is capped at 6deg so rotated card corners always stay inside the
// horizontal edge padding and never extend the native scroll area.
const ANGLE_STEP = 1.5;
const MAX_ANGLE = 6;
const MAX_DROP = 20;
const LIFT_PAD = 36;
const DROP_PAD = 26;
const SELECT_GAP = 14;
const TRACK_WIDTH = 48;
const THUMB_WIDTH = 16;

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
  if (first.type === "skip" || first.type === "reverse" || first.type === "skipAll") {
    return card.type === first.type;
  }
  return false;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function HandScrollbar({ scrollerRef }: { scrollerRef: RefObject<HTMLDivElement> }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!scroller || !track || !thumb) return;

    const update = () => {
      const inner = scroller.firstElementChild as HTMLElement | null;
      const maxScroll = inner ? inner.offsetWidth - scroller.clientWidth : 0;
      const scrollable = maxScroll > 1;
      track.style.visibility = scrollable ? "visible" : "hidden";
      if (scrollable) {
        const ratio = clamp(scroller.scrollLeft / maxScroll, 0, 1);
        thumb.style.left = `${ratio * (TRACK_WIDTH - THUMB_WIDTH)}px`;
      }
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scrollerRef]);

  return (
    <div
      ref={trackRef}
      className="relative h-1 rounded-full bg-white/15"
      style={{ width: `${TRACK_WIDTH}px`, visibility: "hidden" }}
    >
      <div
        ref={thumbRef}
        className="absolute top-0 h-1 rounded-full bg-white/70"
        style={{ width: `${THUMB_WIDTH}px`, left: 0 }}
      />
    </div>
  );
}

export function MyHand({
  view,
  selectedCards,
  unoArmed,
  onToggleCard,
  onToggleUnoArmed,
  onPlaySelected,
  onClearSelection,
  onSelectAll,
  colorPickerVisible,
  myOrderNumber = null,
}: MyHandProps) {
  const length = view.myHand.length;
  const overlapPx = Math.max(8, 30 - length * 2);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const hasDealt = useRef(false);
  const prevCardIds = useRef<Set<string>>(new Set());
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());

  const isFirstDeal = !hasDealt.current && length > 0;

  const centerHand = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
  }, []);

  const centeredOnDeal = useRef(false);
  useLayoutEffect(() => {
    if (length === 0) {
      centeredOnDeal.current = false;
      return;
    }
    if (centeredOnDeal.current) return;
    centeredOnDeal.current = true;
    centerHand();
  }, [length, centerHand]);

  useEffect(() => {
    if (length > 0 && !hasDealt.current) {
      hasDealt.current = true;
    }
  }, [length]);

  useEffect(() => {
    const currentIds = new Set(view.myHand.map((c) => c.id));
    const entering = new Set<string>();
    for (const id of currentIds) {
      if (!prevCardIds.current.has(id)) {
        entering.add(id);
      }
    }

    const isFullReplace = entering.size === currentIds.size;
    prevCardIds.current = currentIds;

    if (entering.size === 0) return;

    if (isFullReplace) {
      centerHand();
      return;
    }

    setNewCardIds(entering);
    const firstNewCard = view.myHand.find((c) => entering.has(c.id));
    if (firstNewCard) {
      requestAnimationFrame(() => {
        scrollerRef.current
          ?.querySelector(`[data-card-id="${CSS.escape(firstNewCard.id)}"]`)
          ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      });
    }
    const timeout = setTimeout(() => setNewCardIds(new Set()), 300);
    return () => clearTimeout(timeout);
  }, [view.myHand, centerHand]);

  const onWheel = useCallback((e: WheelEvent) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const inner = scroller.firstElementChild as HTMLElement | null;
    if (!inner || inner.offsetWidth <= scroller.clientWidth) return;
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    e.preventDefault();
    scroller.scrollLeft += e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
  }, []);

  const showUnoToggle =
    selectedCards.size > 0 &&
    getRemainingHandCountAfterPlay(view.myHand, Array.from(selectedCards), view.gameMode) === 1;

  const eligibleExtraIds = view.myHand
    .filter((card) => !selectedCards.has(card.id) && canToggleCard(view, selectedCards, card))
    .map((card) => card.id);

  const mid = (length - 1) / 2;

  return (
    <div className="relative flex flex-col items-center gap-2 pb-4">
      {selectedCards.size > 0 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mb-2" style={{ animation: "bounce-in 0.3s ease-out" }}>
          {showUnoToggle && (
            <button
              onClick={onToggleUnoArmed}
              className={`font-black text-sm px-4 py-2 rounded-full shadow-lg transition-colors cursor-pointer ${
                unoArmed
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {unoArmed ? "UNO armed" : "Call UNO"}
            </button>
          )}
          {eligibleExtraIds.length > 0 && (
            <button
              onClick={() => onSelectAll(eligibleExtraIds)}
              className="bg-white/10 text-white font-black text-sm px-4 py-2 rounded-full shadow-lg hover:bg-white/20 transition-colors cursor-pointer"
            >
              Select all
            </button>
          )}
          <button
            onClick={onPlaySelected}
            className="bg-red-600 text-white font-bold text-sm px-5 py-2 rounded-full shadow-lg hover:bg-red-700 transition-colors cursor-pointer"
          >
            Play {selectedCards.size} card{selectedCards.size > 1 ? "s" : ""}
          </button>
          <button
            onClick={onClearSelection}
            className="bg-neutral-700 text-white rounded-full w-7 h-7 text-xs flex items-center justify-center hover:bg-neutral-600 transition-colors cursor-pointer"
          >
            X
          </button>
        </div>
      )}
      <div
        ref={scrollerRef}
        className="uno-hand-scroller w-full overflow-x-auto overflow-y-hidden"
        onWheel={onWheel}
        style={{
          paddingTop: `${LIFT_PAD}px`,
          paddingBottom: `${DROP_PAD}px`,
          touchAction: "pan-x",
          overscrollBehaviorX: "contain",
        }}
      >
        <div className="flex w-max min-w-full items-end justify-center px-4">
          {view.myHand.map((card, index) => {
            const isPlayable = canToggleCard(view, selectedCards, card);
            const isSelected = selectedCards.has(card.id);
            const leftNeighborSelected = index > 0 && selectedCards.has(view.myHand[index - 1].id);
            const marginLeft =
              index === 0
                ? 0
                : -overlapPx + (isSelected ? SELECT_GAP : 0) + (leftNeighborSelected ? SELECT_GAP : 0);

            const rel = index - mid;
            const angle = clamp(rel * ANGLE_STEP, -MAX_ANGLE, MAX_ANGLE);
            const offsetY = Math.min(MAX_DROP, rel * rel * 1.2);

            let animationStyle: string | undefined;
            if (isFirstDeal) {
              animationStyle = `card-deal 0.4s ease-out ${index * 80}ms both`;
            } else if (newCardIds.has(card.id)) {
              animationStyle = "card-enter-hand 0.3s ease-out";
            }

            return (
              <div
                key={card.id}
                data-card-id={card.id}
                className="flex-shrink-0"
                style={{
                  marginLeft: `${marginLeft}px`,
                  zIndex: isSelected || colorPickerVisible ? 50 : index,
                  animation: animationStyle,
                  transition: "margin-left 0.3s ease-out",
                }}
              >
                <div
                  style={{
                    transform: `rotate(${angle}deg) translateY(${offsetY}px)`,
                    transformOrigin: "bottom center",
                    transition: "transform 0.3s ease-out",
                  }}
                >
                  <UnoCard
                    card={card}
                    playable={isPlayable}
                    colorPickerVisible={colorPickerVisible}
                    selected={isSelected}
                    onClick={() => {
                      if (isPlayable) onToggleCard(card.id);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <HandScrollbar scrollerRef={scrollerRef} />
      {length > 0 && (
        <div className="pointer-events-none absolute bottom-1 right-2 z-40 flex h-8 w-8 select-none items-center justify-center rounded-full bg-neutral-800/80 text-sm font-bold text-white">
          {length}
        </div>
      )}
      {length > 0 && myOrderNumber != null && (
        <div className="pointer-events-none absolute bottom-1 left-2 z-40 flex h-8 w-8 select-none items-center justify-center rounded-full bg-neutral-800/80 text-sm font-bold text-neutral-300">
          #{myOrderNumber}
        </div>
      )}
    </div>
  );
}
