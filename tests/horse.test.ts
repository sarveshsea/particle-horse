import { describe, expect, test } from 'vitest';
import { generateHorse } from '../src/horse';
describe('procedural horse', () => {
 test('is reproducible and has independent seeded variation', () => {
  const a = generateHorse(2048, 7), b = generateHorse(2048, 7), c = generateHorse(2048, 8);
  expect(a.positions).toEqual(b.positions);
  expect(a.positions).not.toEqual(c.positions);
 });
 test('has finite coordinates, body, all twelve limb segments, mane and tail', () => {
  const horse = generateHorse(12000, 33);
  expect(horse.positions.length).toBe(36000);
  expect([...horse.positions].every(Number.isFinite)).toBe(true);
  expect(new Set(horse.bones)).toEqual(new Set(Array.from({length: 14}, (_, i) => i)));
  expect(new Set(horse.kinds)).toEqual(new Set([0, 1, 2]));
 });
 test.each([0, -1, 1.5, NaN, 200001])('rejects invalid particle count %s', count => {
  expect(() => generateHorse(count, 1)).toThrow(RangeError);
 });
 test('does not share writable buffers across generations', () => {
  const a = generateHorse(100, 1), b = generateHorse(100, 1);
  a.positions[0] = 999;
  expect(b.positions[0]).not.toBe(999);
 });
});
