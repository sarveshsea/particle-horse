import { describe,it,expect } from 'vitest';
import { meadowPoint,generateMeadow,meadowAttachment } from '../src/meadow';
import { materialHeight,worldHeight,terrainNormal } from '../src/terrain';
describe('meadow hill attachments',()=>{
 it('anchors generated plants to the exact material ground',()=>{
  const field=generateMeadow(60,12,8);
  for(const r of [...field.grass,...field.flowers,...field.bushes])expect(r.y).toBeCloseTo(materialHeight(r.x,r.z),12);
 });
 it('advects roots while preserving world terrain height through complete loops',()=>{
  for(const x of [-17.8,0,17.8])for(const time of [0,.9,6,12.3]){
   const p=meadowPoint(x,.4,time);expect(p.y).toBeCloseTo(worldHeight(p.x,p.z,time),10);
  }
 });
 it('aligns local plant height to the hill normal without moving the root',()=>{
  const root=generateMeadow(1,0,0).grass[0],at=meadowAttachment(root,[0,0,0],.9),p=meadowPoint(root.x,root.z,.9);
  expect(at).toEqual(p);
  const tip=meadowAttachment(root,[0,.15,0],.9),normal=terrainNormal(root.x,root.z);
  expect(tip.x-at.x).toBeCloseTo(normal.x*.15,9);expect(tip.y-at.y).toBeCloseTo(normal.y*.15,9);expect(tip.z-at.z).toBeCloseTo(normal.z*.15,9);
  expect(()=>meadowAttachment(root,[NaN,0,0],0)).toThrow();
 });
});
