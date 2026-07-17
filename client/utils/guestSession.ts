const GUEST_PARAM = "lakebed_guest";
const NAME_KEY = "uno_player_name";
export const DEFAULT_GUEST_USER_ID = "guest:local";

export function sanitizeName(raw: string): string {
  return String(raw || "").replace(/\s+/g, " ").trim().slice(0, 24);
}

export function getStoredName(): string | null {
  try {
    const value = window.localStorage.getItem(NAME_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function ensureGuestParam(): void {
  if (typeof window === "undefined") return;
  const name = getStoredName();
  if (!name) return;
  const url = new URL(window.location.href);
  if (url.searchParams.get(GUEST_PARAM) === name) return;
  url.searchParams.set(GUEST_PARAM, name);
  window.location.replace(url.toString());
}

export function signInWithName(name: string): void {
  const clean = sanitizeName(name);
  if (!clean || clean.toLowerCase() === "local") return;
  try {
    window.localStorage.setItem(NAME_KEY, clean);
  } catch {
    // Ignore storage failures; the query param still carries the identity.
  }
  const url = new URL("/", window.location.origin);
  url.searchParams.set(GUEST_PARAM, clean);
  window.location.href = url.toString();
}

export function signOutGuest(): void {
  try {
    window.localStorage.removeItem(NAME_KEY);
  } catch {
    // Ignore storage failures.
  }
  window.location.href = new URL("/", window.location.origin).toString();
}
