export function qualityForFrame(quality: number, milliseconds: number): number {
  if (!Number.isFinite(milliseconds)) return quality;
  if (milliseconds > 25) return Math.max(0.35, quality - 0.12);
  if (milliseconds < 17) return Math.min(1, quality + 0.025);
  return quality;
}
