import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
test('horse climbs continuous green particle hills without scene errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/');await page.waitForFunction(()=>(window as any).__ARTWORK?.frames>5);
 const a=await page.evaluate(()=>(window as any).__ARTWORK.terrain);
 expect(Number.isFinite(a.height)).toBe(true);expect(Math.abs(a.pitch)).toBeLessThan(.14);
 await expect.poll(async()=>Math.abs((await page.evaluate(()=>(window as any).__ARTWORK.terrain)).height-a.height),{timeout:15000}).toBeGreaterThan(.02);
 const shot=PNG.sync.read(await page.screenshot());let green=0;
 for(let y=Math.floor(shot.height*.6);y<shot.height;y++)for(let x=0;x<shot.width;x++){const i=(y*shot.width+x)*4,r=shot.data[i],g=shot.data[i+1],b=shot.data[i+2];if(g>15&&g>r*1.15&&g>b*1.15)green++;}
 expect(green).toBeGreaterThan(2000);expect(errors).toEqual([]);
});
