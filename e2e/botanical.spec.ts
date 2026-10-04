import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
test('botanical color remains readable while horse stays neutral on a black void',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.waitForFunction(()=>(window as any).__ARTWORK?.frames>0);
 const image=PNG.sync.read(await page.screenshot());let green=0,bloom=0,neutral=0;
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
  const i=(y*image.width+x)*4,[r,g,b]=image.data.subarray(i,i+3);
  if(y>image.height*.55&&g>20&&g>r*1.2&&g>b*1.15)green++;
  if(y>image.height*.55&&Math.max(r,g,b)>35&&((r>g*1.3)||(b>g*1.25)))bloom++;
  if(y<image.height*.65&&r>60&&Math.abs(r-g)<3&&Math.abs(r-b)<3)neutral++;
 }
 expect(green).toBeGreaterThan(1000);expect(bloom).toBeGreaterThan(50);expect(neutral).toBeGreaterThan(500);
 expect(await page.locator('body').innerText()).toBe('');
});
