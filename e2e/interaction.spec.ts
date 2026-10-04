import { test, expect } from '@playwright/test';
const state = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as {__ARTWORK: {impacts:number; wakeStrength:number; cameraYaw:number; dragging:boolean; simulation:string; time:number}}).__ARTWORK);
test('hoof forces generate bounded sand impulses during the gallop', async ({page}) => {
 await page.goto('/');
 await expect.poll(async()=> (await state(page))?.impacts, {timeout:15000}).toBeGreaterThan(0);
 await page.waitForTimeout(1800);
 expect((await state(page)).impacts).toBeLessThanOrEqual(24);
});
test('hover creates a wake, dragging rotates, and leaving releases particles', async ({page}) => {
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect.poll(async()=> (await state(page))?.time).toBeGreaterThan(.1);
 for(let i=0;i<3;i++) {await page.mouse.move(600,450);await page.mouse.move(850,500,{steps:8});}
 await expect.poll(async()=> (await state(page)).wakeStrength).toBeGreaterThan(0);
 const a=(await state(page)).cameraYaw;
 await page.mouse.down();await page.mouse.move(1100,400,{steps:10});
 expect((await state(page)).dragging).toBe(true);await page.mouse.up();
 await expect.poll(async()=>Math.abs((await state(page)).cameraYaw-a)).toBeGreaterThan(.1);
 await page.mouse.move(-20,-20);await expect.poll(async()=> (await state(page)).wakeStrength,{timeout:4000}).toBeLessThan(.01);
 expect(errors).toEqual([]);
});
test('reduced motion disables hover and automatic orbit',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect.poll(async()=> (await state(page))?.cameraYaw).toBeGreaterThan(0);
 const a=await state(page);await page.mouse.move(720,480);await page.waitForTimeout(300);const b=await state(page);
 expect(b.cameraYaw).toBe(a.cameraYaw);expect(b.wakeStrength).toBe(0);
});

test('switching reduced motion on restores a disturbed horse completely',async({page})=>{
 await page.goto('/');await expect.poll(async()=> (await state(page))?.time).toBeGreaterThan(.1);
 await page.mouse.move(700,480);await page.mouse.move(820,470,{steps:15});
 const displacement=()=>page.evaluate(()=>(window as unknown as {__ARTWORK:{inspectWake:()=>number}}).__ARTWORK.inspectWake());
 await expect.poll(displacement).toBeGreaterThan(.02);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(displacement).toBeLessThan(.002);
});
test('fast sweeps pull visible streams out and particles reassemble',async({page})=>{
 await page.goto('/');await expect.poll(async()=> (await state(page))?.time).toBeGreaterThan(.1);
 const displacement=()=>page.evaluate(()=>(window as unknown as {__ARTWORK:{inspectWake:()=>number}}).__ARTWORK.inspectWake());
 for(let i=0;i<3;i++){await page.mouse.move(620,440);await page.mouse.move(840,470,{steps:10});}
 const maximum=await displacement();expect(maximum).toBeGreaterThan(.2);expect(maximum).toBeLessThanOrEqual(.801);
 await page.mouse.move(-20,-20);await expect.poll(displacement,{timeout:3000}).toBeLessThan(.005);
});
