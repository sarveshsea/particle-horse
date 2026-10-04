import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
type Stats={time:number;frames:number;quality:number;averageFrameMs:number;paused:boolean;contextLost:boolean;particles:number;pixelRatio:number};
const stats=(page:import('@playwright/test').Page)=>page.evaluate(()=> (window as unknown as {__ARTWORK:Stats}).__ARTWORK);
test('wordless canvas animates and resizes without runtime errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('canvas')).toHaveCount(1);
 await expect.poll(async()=>(await stats(page))?.frames).toBeGreaterThan(10);
 expect(await page.locator('body').innerText()).toBe('');
 expect(await page.locator('button,a,input,h1,p')).toHaveCount(0);
 const before=await stats(page);await page.waitForTimeout(300);expect((await stats(page)).time).toBeGreaterThan(before.time);
 for(const [width,height] of [[390,844],[1920,1080],[844,390]]){
  await page.setViewportSize({width,height});
  await expect.poll(async()=>(await page.locator('canvas').boundingBox())?.width).toBe(width);
  await expect.poll(async()=>(await page.locator('canvas').boundingBox())?.height).toBe(height);
 }
 expect(errors).toEqual([]);
});
test('reduced motion renders a still frame and resumes when preference changes',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect.poll(async()=>(await stats(page))?.frames).toBeGreaterThan(0);
 const a=await stats(page);await page.waitForTimeout(250);const b=await stats(page);
 expect(b.time).toBe(a.time);expect(b.frames).toBe(a.frames);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect.poll(async()=>(await stats(page)).time).toBeGreaterThan(a.time);
});
test('pauses on hidden tabs and resumes without accumulating elapsed time',async({page})=>{
 await page.goto('/');await expect.poll(async()=>(await stats(page))?.frames).toBeGreaterThan(3);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const a=await stats(page);await page.waitForTimeout(350);expect((await stats(page)).frames).toBe(a.frames);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(async()=>(await stats(page)).frames).toBeGreaterThan(a.frames+2);
 expect((await stats(page)).time-a.time).toBeLessThan(.25);
});
test('recovers after WebGL context loss',async({page})=>{
 await page.goto('/');await expect.poll(async()=>(await stats(page))?.frames).toBeGreaterThan(3);
 await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!;const ext=gl.getExtension('WEBGL_lose_context')!;(window as unknown as {restore:()=>void}).restore=()=>ext.restoreContext();ext.loseContext();});
 await expect.poll(async()=>(await stats(page)).contextLost).toBe(true);
 await page.waitForTimeout(100);await page.evaluate(()=>(window as unknown as {restore:()=>void}).restore());
 await expect.poll(async()=>(await stats(page)).contextLost).toBe(false);
 const a=await stats(page);await expect.poll(async()=>(await stats(page)).frames).toBeGreaterThan(a.frames+2);
});
test('renders a nonempty horse on a black background in portrait mode',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect.poll(async()=>(await stats(page))?.frames).toBeGreaterThan(0);
 const image=PNG.sync.read(await page.screenshot());
 let bright=0,black=0;
 for(let i=0;i<image.data.length;i+=4){if(image.data[i]>60)bright++;if(image.data[i]<3&&image.data[i+1]<3&&image.data[i+2]<3)black++;}
 const pixels={bright,black,total:image.width*image.height};
 expect(pixels.bright).toBeGreaterThan(500);expect(pixels.black/pixels.total).toBeGreaterThan(.7);
});

test('reduces actual rendering density under sustained slow frames',async({page})=>{
 await page.addInitScript(()=>{const request=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>request(t=>{const start=performance.now();while(performance.now()-start<32){}callback(t);});});
 await page.goto('/');
 await expect.poll(async()=>(await stats(page))?.quality,{timeout:12000}).toBeLessThan(1);
 expect((await stats(page)).particles).toBeLessThan(76000);
 await page.setViewportSize({width:844,height:390});
 await expect.poll(async()=>(await page.locator('canvas').boundingBox())?.width).toBe(844);
 const ratio=await page.evaluate(()=>document.querySelector('canvas')!.width/innerWidth);
 expect(ratio).toBeLessThan(await page.evaluate(()=>Math.min(devicePixelRatio,1.75)));
});
