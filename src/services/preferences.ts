export interface BooleanPreference {
  get(): boolean;
  set(value: boolean): void;
}

export function createPreference(key: string, fallback: boolean): BooleanPreference {
  let value = fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved === "true" || saved === "false") value = saved === "true";
  } catch {
    // Storage can be unavailable; the preference remains usable in memory.
  }
  return {
    get: () => value,
    set(next) {
      value = next;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // Keep the in-memory preference when persistence is unavailable.
      }
    },
  };
}
