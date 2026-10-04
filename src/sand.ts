import { randomSource } from "./equine";
export function generateSand(count: number, seed = 108) {
  if (!Number.isInteger(count) || count < 1 || count > 150000)
    throw new RangeError("Sand population must be an integer from 1 to 150000");
  const random = randomSource(seed),
    positions = new Float32Array(count * 3),
    seeds = new Float32Array(count),
    sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = (random() - 0.5) * 36,
      z = (random() - 0.5) * 22;
    const y =
      -0.032 +
      0.012 * Math.sin(x * 0.9 + z * 0.7) +
      0.008 * Math.sin(x * 2.3 - z * 1.1);
    positions.set([x, y, z], i * 3);
    seeds[i] = random();
    sizes[i] = 0.6 + random() * 0.8;
  }
  return { positions, seeds, sizes };
}
