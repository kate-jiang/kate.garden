import type { TierResult } from "detect-gpu";

export async function shouldUseGarden(
  detect: () => Promise<TierResult> = async () => {
    const { getGPUTier } = await import("detect-gpu");
    return getGPUTier({ desktopTiers: [0, 15, 30, 60], mobileTiers: [0, 15, 30, 60] });
  },
  timeoutMs = 4000,
  userAgent = globalThis.navigator?.userAgent ?? ""
): Promise<boolean> {
  // Safari masks GPU identity; let it through.
  const allowSafari =
    /\b(Macintosh|iPhone|iPad|iPod)\b/.test(userAgent) &&
    /\bVersion\/[\d.]+.*\bSafari\//.test(userAgent);

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      detect().then(result =>
        result.type === "BENCHMARK" ? result.tier >= 3 : result.type === "FALLBACK" && allowSafari
      ),
      new Promise<boolean>(resolve => {
        timeout = setTimeout(() => resolve(allowSafari), timeoutMs);
      }),
    ]);
  } catch {
    return allowSafari;
  } finally {
    clearTimeout(timeout);
  }
}
