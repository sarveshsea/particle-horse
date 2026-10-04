import { test, expect } from '@playwright/test';
test('layered sand erupts on four distinct hoof tracks without pointer input', async ({ page }) => {
 await page.goto('/');
 await page.waitForFunction(() => Boolean((window as any).__ARTWORK));
 const evidence = await page.evaluate(async () => {
  const state = (window as any).__ARTWORK;
  const events = new Map<string, {id:string;hoof:number;born:number}>();
  const began = state.time;
  let largestSpray = 0;
  await new Promise<void>(resolve => {
   const inspect = () => {
    for (const event of state.inspectContacts()) events.set(event.id, event);
    largestSpray = Math.max(largestSpray, state.activeSpray);
    if (state.time - began >= 2.7) resolve(); else requestAnimationFrame(inspect);
   };
   inspect();
  });
  return { layers: state.floorLayers, populations: state.inspectFloor(), events: [...events.values()], largestSpray, wake: state.wakeStrength };
 });
 expect(evidence.layers).toBe(3);
 expect(evidence.populations.every((count:number) => count > 0)).toBe(true);
 expect(new Set(evidence.events.map(event => event.hoof)).size).toBe(4);
 expect(evidence.events.length).toBeGreaterThanOrEqual(10);
 for (let hoof = 0; hoof < 4; hoof++) {
  const strikes = evidence.events.filter(event => event.hoof === hoof);
  for (let i = 1; i < strikes.length; i++) expect(strikes[i].born - strikes[i - 1].born).toBeCloseTo(.9, 5);
 }
 expect(evidence.largestSpray).toBeGreaterThan(1000);
 expect(evidence.largestSpray).toBeLessThanOrEqual(24 * 1536);
 expect(evidence.wake).toBe(0);
});
