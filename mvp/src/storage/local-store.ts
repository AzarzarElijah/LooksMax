// Thin, typed wrapper around localStorage. All MVP persistence goes
// through this — no Supabase, no network storage. See mvp/README.md
// "Data storage" for why.

const PREFIX = "glow_mvp_";

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private browsing) — fail silently,
    // the app still works for the current session.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export function clearAll(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  onboarding: "onboarding_profile",
  scans: "scan_history",
} as const;
