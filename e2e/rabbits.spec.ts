import {test,expect} from '@playwright/test';
test('white rabbits run opposite the horse and follow the rolling ground',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/');await page.waitForFunction(()=>(window as any).__ARTWORK?.frames>5);
 const a=await page.evaluate(()=>(window as any).__ARTWORK.rabbits);
 expect(a.count).toBe(3);expect(a.positions).toHaveLength(3);
 await page.waitForTimeout(180);const b=await page.evaluate(()=>(window as any).__ARTWORK.rabbits);
 for(let i=0;i<3;i++){expect(b.positions[i].speed).toBeLessThan(-6);expect([b.positions[i].x,b.positions[i].y,b.positions[i].z].every(Number.isFinite)).toBe(true);if(Math.abs(b.positions[i].x-a.positions[i].x)<20)expect(b.positions[i].x).toBeLessThan(a.positions[i].x);}
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const still=await page.evaluate(()=>(window as any).__ARTWORK.rabbits);await page.waitForTimeout(200);expect(await page.evaluate(()=>(window as any).__ARTWORK.rabbits.positions)).toEqual(still.positions);
 expect(errors).toEqual([]);
});
test('portrait retains two rabbits without visible copy',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.waitForFunction(()=>(window as any).__ARTWORK?.frames>5);expect(await page.evaluate(()=>(window as any).__ARTWORK.rabbits.count)).toBe(2);expect(await page.locator('body').innerText()).toBe('');
});
