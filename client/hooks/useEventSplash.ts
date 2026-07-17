import { useEffect, useRef, useState } from "preact/hooks";
import type { PlayerView } from "../../shared/gameTypes";
import type { EventSplashData } from "../components/game/EventSplash";

const EVENT_SPLASH_MS = 3000;

export function useEventSplash(
  view: PlayerView | null,
  paused: boolean,
): EventSplashData | null {
  const [current, setCurrent] = useState<EventSplashData | null>(null);
  const [queue, setQueue] = useState<EventSplashData[]>([]);
  const prevRef = useRef<{
    finished: string[];
    eliminated: string[];
    publicEventId: string | null;
  } | null>(null);
  const announcedFinishedRef = useRef<Set<string>>(new Set());
  const announcedEliminatedRef = useRef<Set<string>>(new Set());

  const signature = view
    ? `${view.phase}|${view.finishedPlayers.join(",")}|${view.eliminatedPlayers.join(",")}|${view.publicEvent?.id ?? ""}`
    : "null";

  useEffect(() => {
    if (!view) {
      prevRef.current = null;
      announcedFinishedRef.current = new Set();
      announcedEliminatedRef.current = new Set();
      setQueue([]);
      setCurrent(null);
      return;
    }

    const name = (userId: string) =>
      view.turnOrder.find((p) => p.userId === userId)?.displayName || "Unknown";
    const cardCountOf = (userId: string) =>
      view.turnOrder.find((p) => p.userId === userId)?.cardCount;

    if (prevRef.current === null) {
      prevRef.current = {
        finished: [...view.finishedPlayers],
        eliminated: [...view.eliminatedPlayers],
        publicEventId: view.publicEvent?.id ?? null,
      };
      announcedFinishedRef.current = new Set(view.finishedPlayers);
      announcedEliminatedRef.current = new Set(view.eliminatedPlayers);
      return;
    }

    const prev = prevRef.current;

    if (view.phase === "finished") {
      const closing: EventSplashData[] = [];
      const newGoer = view.finishedPlayers.find(
        (userId) =>
          !announcedFinishedRef.current.has(userId) &&
          !view.eliminatedPlayers.includes(userId) &&
          cardCountOf(userId) === 0,
      );
      if (newGoer) {
        closing.push({ id: `out-${newGoer}-${Date.now()}`, kind: "wentOut", playerName: name(newGoer) });
      } else {
        const newElim = view.eliminatedPlayers.find(
          (userId) => !announcedEliminatedRef.current.has(userId),
        );
        if (newElim) {
          closing.push({ id: `elim-${newElim}-${Date.now()}`, kind: "eliminated", playerName: name(newElim) });
        }
      }

      if (closing.length > 0) setQueue((q) => [...q, ...closing]);

      announcedFinishedRef.current = new Set(view.finishedPlayers);
      announcedEliminatedRef.current = new Set(view.eliminatedPlayers);
      prevRef.current = {
        finished: [...view.finishedPlayers],
        eliminated: [...view.eliminatedPlayers],
        publicEventId: view.publicEvent?.id ?? null,
      };
      return;
    }

    const toEnqueue: EventSplashData[] = [];

    if (view.publicEvent && view.publicEvent.id !== prev.publicEventId) {
      if (view.publicEvent.type === "handsPassed") {
        toEnqueue.push({
          id: view.publicEvent.id,
          kind: "handsPassed",
          actorName: name(view.publicEvent.actorId),
        });
      } else if (view.publicEvent.type === "handsSwapped") {
        toEnqueue.push({
          id: view.publicEvent.id,
          kind: "handsSwapped",
          actorName: name(view.publicEvent.actorId),
          targetName: name(view.publicEvent.targetId),
        });
      }
    }

    for (const userId of view.finishedPlayers) {
      if (announcedFinishedRef.current.has(userId)) continue;
      if (view.eliminatedPlayers.includes(userId)) continue;
      if (cardCountOf(userId) !== 0) continue;
      if (view.phase === "stacking") continue;
      toEnqueue.push({ id: `out-${userId}-${Date.now()}`, kind: "wentOut", playerName: name(userId) });
      announcedFinishedRef.current.add(userId);
    }

    for (const userId of view.eliminatedPlayers) {
      if (announcedEliminatedRef.current.has(userId)) continue;
      toEnqueue.push({ id: `elim-${userId}-${Date.now()}`, kind: "eliminated", playerName: name(userId) });
      announcedEliminatedRef.current.add(userId);
      announcedFinishedRef.current.add(userId);
    }

    for (const userId of Array.from(announcedFinishedRef.current)) {
      if (!view.finishedPlayers.includes(userId)) {
        announcedFinishedRef.current.delete(userId);
      }
    }

    if (toEnqueue.length > 0) setQueue((q) => [...q, ...toEnqueue]);

    prevRef.current = {
      finished: [...view.finishedPlayers],
      eliminated: [...view.eliminatedPlayers],
      publicEventId: view.publicEvent?.id ?? null,
    };
  }, [signature]);

  useEffect(() => {
    if (current === null && queue.length > 0 && !paused) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [current, queue, paused]);

  useEffect(() => {
    if (current === null) return;
    const t = setTimeout(() => setCurrent(null), EVENT_SPLASH_MS);
    return () => clearTimeout(t);
  }, [current]);

  return current;
}
