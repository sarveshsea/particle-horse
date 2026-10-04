import { expect,test } from 'vitest';
import { generateHair, hairPoint } from '../src/hair';
const guideCount=4;
const tailGuide=new Float32Array([0,1,0,-.3,1,0,-.6,1,0,-1,1,0, 0,1.1,0,-.3,1.1,0,-.6,1.1,0,-1,1.1,0]);
const guide={tailGuide,guideCount,mesh:{frameCount:2,cycleSeconds:.62}};
test('hair generation is seeded, tapered, length-varied and finite',()=>{
 const a=generateHair(200,32,71),b=generateHair(200,32,71);
 expect(a).toEqual(b);expect(a.positions.length).toBe(200*32*3);
 expect(a.strand.every(Number.isFinite)).toBe(true);
 expect(new Set(a.strand.filter((_,i)=>i%4===1)).size).toBeGreaterThan(100);
 expect(()=>generateHair(0,32)).toThrow();expect(()=>generateHair(10,1)).toThrow();
});
test('strand roots remain anchored and the gait loop is continuous',()=>{
 const hair=generateHair(10,32);
 const root=hairPoint(guide,0,0,hair.strand.slice(0,4));
 expect(root[1]).toBeCloseTo(1,5);
 expect(hairPoint(guide,.62,0,hair.strand.slice(0,4))).toEqual(root);
 const tip=hairPoint(guide,0,1,hair.strand.slice(0,4));expect(tip.every(Number.isFinite)).toBe(true);
 expect(tip[1]).toBeLessThan(root[1]);
 const a=hairPoint(guide,.62-1e-8,1,hair.strand.slice(0,4)),b=hairPoint(guide,1e-8,1,hair.strand.slice(0,4));
 expect(Math.hypot(...a.map((x,i)=>x-b[i]))).toBeLessThan(.00001);
});
