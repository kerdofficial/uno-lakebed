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
    publicEventId: string | null;
  } | null>(null);
  const announcedOutRef = useRef<Set<string>>(new Set());
  const announcedEliminatedRef = useRef<Set<string>>(new Set());

  const outPlayers = view?.outPlayers ?? [];
  const signature = view
    ? `${view.phase}|${outPlayers.join(",")}|${view.eliminatedPlayers.join(",")}|${view.publicEvent?.id ?? ""}`
    : "null";

  useEffect(() => {
    if (!view) {
      prevRef.current = null;
      announcedOutRef.current = new Set();
      announcedEliminatedRef.current = new Set();
      setQueue([]);
      setCurrent(null);
      return;
    }

    const name = (userId: string) =>
      view.turnOrder.find((p) => p.userId === userId)?.displayName || "Unknown";

    if (prevRef.current === null) {
      prevRef.current = {
        publicEventId: view.publicEvent?.id ?? null,
      };
      announcedOutRef.current = new Set(outPlayers);
      announcedEliminatedRef.current = new Set(view.eliminatedPlayers);
      return;
    }

    const prev = prevRef.current;

    const toEnqueue: EventSplashData[] = [];

    for (const userId of outPlayers) {
      if (announcedOutRef.current.has(userId)) continue;
      if (view.eliminatedPlayers.includes(userId)) continue;
      toEnqueue.push({ id: `out-${userId}-${Date.now()}`, kind: "wentOut", playerName: name(userId) });
      announcedOutRef.current.add(userId);
    }

    for (const userId of view.eliminatedPlayers) {
      if (announcedEliminatedRef.current.has(userId)) continue;
      toEnqueue.push({ id: `elim-${userId}-${Date.now()}`, kind: "eliminated", playerName: name(userId) });
      announcedEliminatedRef.current.add(userId);
      announcedOutRef.current.add(userId);
    }

    if (
      view.phase !== "finished" &&
      view.publicEvent &&
      view.publicEvent.id !== prev.publicEventId
    ) {
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

    for (const userId of Array.from(announcedOutRef.current)) {
      if (!outPlayers.includes(userId) && !view.eliminatedPlayers.includes(userId)) {
        announcedOutRef.current.delete(userId);
      }
    }

    for (const userId of Array.from(announcedEliminatedRef.current)) {
      if (!view.eliminatedPlayers.includes(userId)) {
        announcedEliminatedRef.current.delete(userId);
      }
    }

    if (toEnqueue.length > 0) setQueue((q) => [...q, ...toEnqueue]);

    prevRef.current = {
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
