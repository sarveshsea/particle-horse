import { expect, test } from "vitest";
import { qualityForFrame } from "../src/dynamics";
test("quality falls on slow frames and recovers conservatively", () => {
  expect(qualityForFrame(1, 40)).toBeLessThan(1);
  expect(qualityForFrame(0.5, 12)).toBeGreaterThan(0.5);
  expect(qualityForFrame(0.5, 17.7)).toBe(0.5);
  expect(qualityForFrame(0.35, 100)).toBe(0.35);
  expect(qualityForFrame(1, 10)).toBe(1);
  expect(qualityForFrame(0.5, NaN)).toBe(0.5);
});

test("adapts to a 60 fps desktop budget and a 30 fps compact budget",()=>{
 expect(qualityForFrame(1,22)).toBeLessThan(1);
 expect(qualityForFrame(.5,33,1000/30)).toBeGreaterThan(.5);
 expect(qualityForFrame(.5,40,1000/30)).toBeLessThan(.5);
});
