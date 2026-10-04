import { expect, test } from "vitest";
import { qualityForFrame } from "../src/dynamics";
test("quality falls on slow frames and recovers conservatively", () => {
  expect(qualityForFrame(1, 40)).toBeLessThan(1);
  expect(qualityForFrame(0.5, 12)).toBeGreaterThan(0.5);
  expect(qualityForFrame(0.5, 20)).toBe(0.5);
  expect(qualityForFrame(0.35, 100)).toBe(0.35);
  expect(qualityForFrame(1, 10)).toBe(1);
  expect(qualityForFrame(0.5, NaN)).toBe(0.5);
});
