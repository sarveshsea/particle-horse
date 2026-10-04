import { test, expect } from '@playwright/test';
test('recorded sound unlocks once, follows contacts, and mutes without visible UI',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>Boolean((window as any).__ARTWORK));
 expect(await page.evaluate(()=>(window as any).__ARTWORK.audio?.unlocked)).toBe(false);
 await page.mouse.click(300,300);
 await page.waitForFunction(()=>(window as any).__ARTWORK.audio?.status==='ready');
 await page.waitForFunction(()=>(window as any).__ARTWORK.audio.playedImpacts>=4);
 expect(await page.evaluate(()=>(window as any).__ARTWORK.captureAudio().getAudioTracks().length)).toBe(1);
 await page.keyboard.press('m');expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.muted)).toBe(true);
 await page.keyboard.press('m');expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.muted)).toBe(false);
 expect(await page.locator('body').innerText()).toBe('');
});
test('recorded sound pauses for reduced motion and hidden tabs',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>Boolean((window as any).__ARTWORK));await page.mouse.click(300,300);
 await page.waitForFunction(()=>(window as any).__ARTWORK.audio?.playedImpacts>=1);
 await page.emulateMedia({reducedMotion:'reduce'});
 const hits=await page.evaluate(()=>(window as any).__ARTWORK.audio.playedImpacts);
 await page.waitForTimeout(350);expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.playedImpacts)).toBe(hits);
 expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.activeVoices)).toBe(0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction((old)=>(window as any).__ARTWORK.audio.playedImpacts>old,hits);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.activeVoices)).toBe(0);
 const paused=await page.evaluate(()=>({hits:(window as any).__ARTWORK.audio.playedImpacts,time:(window as any).__ARTWORK.time}));
 await page.waitForTimeout(900);
 expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.playedImpacts)).toBe(paused.hits);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction((old)=>(window as any).__ARTWORK.audio.playedImpacts>old,paused.hits);
 const resumed=await page.evaluate(()=>({hits:(window as any).__ARTWORK.audio.playedImpacts,time:(window as any).__ARTWORK.time}));
 expect(resumed.hits-paused.hits).toBeLessThanOrEqual(4);expect(resumed.time-paused.time).toBeLessThan(.9);
});
test('failed audio downloads leave the running artwork usable',async({page})=>{
 await page.route('**/audio/**',route=>route.fulfill({status:404,body:''}));await page.goto('/');await page.waitForFunction(()=>Boolean((window as any).__ARTWORK));await page.mouse.click(300,300);
 await page.waitForFunction(()=>(window as any).__ARTWORK.audio?.status==='unavailable');
 const before=await page.evaluate(()=>(window as any).__ARTWORK.frames);await page.waitForFunction((old)=>(window as any).__ARTWORK.frames>old,before);
 expect(await page.locator('canvas').count()).toBe(1);
});

test('touch tap unlocks recorded audio',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,viewport:{width:390,height:844}});const page=await context.newPage();
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>Boolean((window as any).__ARTWORK));await page.touchscreen.tap(195,400);
 await page.waitForFunction(()=>(window as any).__ARTWORK.audio?.playedImpacts>=1);expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.unlocked)).toBe(true);await context.close();
});
test('context restoration restarts sound without queued contacts',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>Boolean((window as any).__ARTWORK));await page.mouse.click(300,300);await page.waitForFunction(()=>(window as any).__ARTWORK.audio?.playedImpacts>=1);
 const supported=await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!;const extension=gl.getExtension('WEBGL_lose_context');if(!extension)return false;(window as any).__loss=extension;extension.loseContext();return true;});test.skip(!supported,'Context-loss extension unavailable');
 await page.waitForFunction(()=>(window as any).__ARTWORK.contextLost);expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.activeVoices)).toBe(0);
 const hits=await page.evaluate(()=>(window as any).__ARTWORK.audio.playedImpacts);await page.waitForTimeout(300);await page.evaluate(()=>(window as any).__loss.restoreContext());await page.waitForFunction(()=>(window as any).__ARTWORK.contextLost===false);
 await page.waitForFunction((old)=>(window as any).__ARTWORK.audio.playedImpacts>old,hits);expect(await page.evaluate(()=>(window as any).__ARTWORK.audio.playedImpacts-hits)).toBeLessThanOrEqual(4);
});
