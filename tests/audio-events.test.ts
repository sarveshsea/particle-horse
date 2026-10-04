import { describe, it, expect } from 'vitest';
import { scheduleContacts } from '../src/audio-events';
const event=(id:string,born:number)=>({id,hoof:0,born,x:0,y:0,z:0,strength:1,contactDuration:.12});
describe('contact audio scheduling',()=>{
 it('plays each contact once without mutating prior history',()=>{const previous=new Set<string>();const first=scheduleContacts(previous,[event('1',1),event('1',1)],1.02);expect(first.events).toHaveLength(1);expect(previous.size).toBe(0);expect(scheduleContacts(first.seen,[event('1',1)],1.03).events).toHaveLength(0);});
 it('drops stale impacts after pause instead of queuing playback',()=>{expect(scheduleContacts(new Set(),[event('old',0)],2).events).toHaveLength(0);});
 it('rejects future events and invalid parameters',()=>{expect(scheduleContacts(new Set(),[event('future',2)],1).events).toHaveLength(0);expect(()=>scheduleContacts(new Set(),[],NaN)).toThrow();expect(scheduleContacts(new Set(),[{...event('bad',1),strength:NaN}],1).events).toHaveLength(0);});
 it('bounds retained scheduling history',()=>{const previous=new Set(Array.from({length:300},(_,i)=>String(i)));expect(scheduleContacts(previous,[event('new',1)],1).seen.size).toBeLessThanOrEqual(128);});
});
