export async function shouldUseGarden(
  detect: () => Promise<{ tier: number }> = async () => {
    const { getGPUTier } = await import("detect-gpu");
    return getGPUTier({ desktopTiers: [0, 15, 30, 60], mobileTiers: [0, 15, 30, 60] });
  },
  timeoutMs = 4000
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      detect().then(result => result.tier >= 3),
      new Promise<boolean>(resolve => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
