import {test,expect} from '@playwright/test';
type BrushState={count:number;hit:string;segments:ReadonlyArray<{start:readonly number[];end:readonly number[]}>};
const brush=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as unknown as {__ARTWORK:{inspectBrush:()=>BrushState}}).__ARTWORK.inspectBrush());
test('cursor selects horse and ground depth without connecting unrelated surfaces',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/');await page.waitForFunction(()=>(window as any).__ARTWORK?.frames>5);
 await page.mouse.move(760,450);await expect.poll(async()=>(await brush(page)).hit).toBe('horse');
 await page.mouse.move(810,460,{steps:5});await expect.poll(async()=>(await brush(page)).count).toBeGreaterThan(0);
 await page.mouse.move(760,850);await expect.poll(async()=>(await brush(page)).hit).toBe('terrain');
 const state=await brush(page);expect(state.count).toBeLessThanOrEqual(8);
 const last=state.segments.at(-1)!;expect(Math.hypot(...last.start.map((v,i)=>v-last.end[i]))).toBeLessThan(.001);
 await page.mouse.move(-20,-20);await page.waitForTimeout(800);await page.mouse.move(760,450);await expect.poll(async()=>(await brush(page)).hit).toBe('horse');
 expect(errors).toEqual([]);
});
