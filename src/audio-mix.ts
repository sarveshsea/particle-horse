export function contactMix(strength: number, variant: number) {
  if (![strength, variant].every(Number.isFinite)) throw new RangeError('Contact mix input must be finite');
  const gain = Math.min(1, Math.max(0, strength));
  const index = Math.abs(Math.trunc(variant)) % 4;
  return {
    hoof: { level: .36 * gain, rate: .99 + index * .012, duration: .13, delay: 0 },
    sand: { level: .075 * gain, rate: 1.02 + index * .018, duration: .17, delay: .016 },
  } as const;
}
