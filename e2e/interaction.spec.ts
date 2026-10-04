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
 await page.mouse.move(-20,-20);const released=(await state(page)).time;
 await expect.poll(async()=> (await state(page)).time,{timeout:12000}).toBeGreaterThan(released+2);
 expect(await displacement()).toBeLessThan(.005);
});
test('touch taps disturb locally and touch drags only steer the camera',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173');await expect.poll(async()=> (await state(page))?.time).toBeGreaterThan(.1);
 await page.touchscreen.tap(210,405);await expect.poll(async()=> (await state(page)).wakeStrength).toBeGreaterThan(.1);
 const a=(await state(page)).cameraYaw;const session=await context.newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:400,id:1}]});
 for(let x=160;x<=290;x+=10){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:400,id:1}]});await page.waitForTimeout(16);}
 await expect.poll(async()=> (await state(page)).dragging).toBe(true);
 expect((await state(page)).wakeStrength).toBe(0);
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
 expect((await state(page)).wakeStrength).toBe(0);expect(Math.abs((await state(page)).cameraYaw-a)).toBeGreaterThan(.1);
 expect(errors).toEqual([]);await context.close();
});
test('analytic fallback works without floating-point render targets',async({page})=>{
 await page.addInitScript(()=>{const original=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='EXT_color_buffer_float'?null:original.call(this,name);};});
 const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect.poll(async()=> (await state(page))?.simulation).toBe('analytic');await page.mouse.move(650,450);await page.mouse.move(850,460,{steps:10});await expect.poll(async()=> (await state(page)).wakeStrength).toBeGreaterThan(0);
 await page.mouse.move(-20,-20);await expect.poll(async()=> (await state(page)).wakeStrength).toBeLessThan(.01);expect(errors).toEqual([]);
});
