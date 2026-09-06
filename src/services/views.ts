export async function fetchViewCount(signal?: AbortSignal): Promise<number | null> {
  try {
    const response = await fetch("/api/views", { signal });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("count" in data)) return null;
    return typeof data.count === "number" && Number.isSafeInteger(data.count) && data.count >= 0
      ? data.count
      : null;
  } catch {
    return null;
  }
}
