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

test("adapts to a 60 fps desktop budget and a 30 fps compact budget", () => {
  expect(qualityForFrame(1, 22)).toBeLessThan(1);
  expect(qualityForFrame(0.5, 33, 1000 / 30)).toBeGreaterThan(0.5);
  expect(qualityForFrame(0.5, 40, 1000 / 30)).toBeLessThan(0.5);
});

test('samples sustained slow rendering by wall time without waiting ninety frames', async()=> {
 const {qualityWindowReady} = await import('../src/dynamics');
 expect(qualityWindowReady(10,1600)).toBe(false);
 expect(qualityWindowReady(30,1600)).toBe(true);
 expect(qualityWindowReady(90,1000)).toBe(true);
 expect(qualityWindowReady(60,1000)).toBe(false);
});
test('protects sparkle sharpness before degrading drawing resolution',async()=>{
 const {drawingRatioScale}=await import('../src/dynamics');
 expect(drawingRatioScale(1)).toBe(1);expect(drawingRatioScale(.35)).toBeGreaterThanOrEqual(.84);
 expect(drawingRatioScale(.35)).toBeLessThan(.86);expect(()=>drawingRatioScale(NaN)).toThrow();
});
