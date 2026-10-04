export function particleAge(time:number,offset:number,lifetime:number):number {
 if(!Number.isFinite(lifetime)||lifetime<=0)throw new RangeError('Lifetime must be finite and positive');
 return ((time+offset)%lifetime+lifetime)%lifetime;
}
export function qualityForFrame(quality:number,milliseconds:number):number {
 if(!Number.isFinite(milliseconds))return quality;
 if(milliseconds>25)return Math.max(.35,quality-.12);
 if(milliseconds<17)return Math.min(1,quality+.025);
 return quality;
}
export function gridOffset(time:number,span:number):number {
 return particleAge(time*12,0,span)-span/2;
}
