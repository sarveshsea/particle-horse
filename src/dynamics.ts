export function qualityForFrame(
  quality: number,
  milliseconds: number,
  budget = 1000 / 60,
): number {
  if (!Number.isFinite(milliseconds)) return quality;
  if (milliseconds > budget * 1.08) return Math.max(0.35, quality - 0.12);
  if (milliseconds < budget * 1.02) return Math.min(1, quality + 0.025);
  return quality;
}

export function qualityWindowReady(frames: number, elapsedMs: number): boolean {
 return frames >= 15 && (frames >= 90 || elapsedMs >= 1500);
}

export function drawingRatioScale(quality: number): number {
 if (!Number.isFinite(quality)) throw new RangeError('Quality must be finite');
 return Math.sqrt(Math.max(.72, Math.min(1, quality)));
}
