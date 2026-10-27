export interface RacePoint{x:number;y:number;z:number}
export interface RaceVariant{name:string;mode:'time-trial'|'arcade';laps:number;rivals:number;halfWidth:number}
export interface RaceInput{throttle:number;steer:number;brake:boolean;gallop:boolean;drift:boolean;item:boolean}
export type RaceItem='horseshoe'|'oil'|'tonic';
export interface Rider extends RacePoint{id:string;heading:number;speed:number;stamina:number;progress:number;lastS:number;gates:number;penalty:number;boost:number;slip:number;driftCharge:number;item?:RaceItem;finish?:number}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function parseRaceVariant(raw:unknown):RaceVariant{
 const v=raw as Partial<RaceVariant>;if(!v||!['time-trial','arcade'].includes(v.mode??'')||!Number.isInteger(v.laps)||v.laps!<1||v.laps!>5||!Number.isInteger(v.rivals)||v.rivals!<0||v.rivals!>3||!Number.isFinite(v.halfWidth)||v.halfWidth!<3||v.halfWidth!>6)throw new Error('Ungültige Rennvariante.');
 return{name:v.name??'Valentine Rennen',mode:v.mode!,laps:v.laps!,rivals:v.rivals!,halfWidth:v.halfWidth!};
}
export function makeCourse(points:RacePoint[]){
 if(points.length<8||points.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))throw new Error('Ungültige Rennstrecke.');
 const segments=points.map((a,i)=>{const b=points[(i+1)%points.length],dx=b.x-a.x,dz=b.z-a.z;return{a,b,dx,dz,length:Math.hypot(dx,dz),s:0};});
 let length=0;for(const s of segments){s.s=length;length+=s.length;}if(length<50)throw new Error('Rennstrecke zu kurz.');
 const gateCount=Math.ceil(length/18),gateSpacing=length/gateCount;
 const at=(distance:number)=>{const s=((distance%length)+length)%length,segment=segments.find(a=>a.s+a.length>=s)??segments[0],t=segment.length>0?(s-segment.s)/segment.length:0;return{x:segment.a.x+segment.dx*t,y:segment.a.y+(segment.b.y-segment.a.y)*t,z:segment.a.z+segment.dz*t,heading:Math.atan2(segment.dx,segment.dz)};};
 const project=(p:RacePoint)=>{let best={s:0,lateral:0,d:Infinity,y:0,heading:0};for(const seg of segments){if(seg.length<1e-5)continue;const t=clamp(((p.x-seg.a.x)*seg.dx+(p.z-seg.a.z)*seg.dz)/seg.length**2,0,1),dx=p.x-seg.a.x-seg.dx*t,dz=p.z-seg.a.z-seg.dz*t,d=dx*dx+dz*dz;if(d<best.d){best.s=seg.s+t*seg.length;best.lateral=(dx*seg.dz-dz*seg.dx)/seg.length;best.d=d;best.y=seg.a.y+(seg.b.y-seg.a.y)*t;best.heading=Math.atan2(seg.dx,seg.dz);};}return best;};
 return{points,length,gateCount,gateSpacing,at,project};
}
export type Course=ReturnType<typeof makeCourse>;
/** Local practice simulation. No wallet, remote position or network result authority. */
export class RaceSimulation{
 phase:'ready'|'countdown'|'racing'|'paused'|'finished'='ready';elapsed=0;countdown=3;
 riders:Rider[]=[];pickups:{s:number;lane:number;availableAt:number}[]=[];oil:{x:number;z:number;expires:number}[]=[];
 message='';eventSerial=0;private previousItem=false;private resumePhase:'countdown'|'racing'='racing';
 constructor(readonly course:Course,readonly variant:RaceVariant){this.reset();}
 get player(){return this.riders[0];}
 get ranking(){return[...this.riders].sort((a,b)=>(a.finish??Infinity)-(b.finish??Infinity)||b.progress-a.progress);}
 private reset(){this.elapsed=0;this.countdown=3;this.previousItem=false;this.oil=[];this.riders=Array.from({length:this.variant.rivals+1},(_,i)=>{const start=this.course.at(-i*2.2),lane=(i%2?1:-1)*(i?1.15:0);return{id:i?['','Copper','Sundance','Calamity'][i]:'Du',x:start.x+Math.cos(start.heading)*lane,y:start.y,z:start.z-Math.sin(start.heading)*lane,heading:start.heading,speed:0,stamina:100,progress:-i*2.2,lastS:(this.course.length-i*2.2)%this.course.length,gates:0,penalty:0,boost:0,slip:0,driftCharge:0};});this.pickups=this.variant.mode==='arcade'?Array.from({length:8},(_,i)=>({s:(i+.5)*this.course.length/8,lane:(i%3-1)*1.8,availableAt:0})):[];}
 start(){this.reset();this.phase='countdown';this.message='Bereit machen';}
 pause(){if(this.phase==='racing'||this.phase==='countdown'){this.resumePhase=this.phase;this.phase='paused';}}
 resume(){if(this.phase==='paused')this.phase=this.resumePhase;}
 pilot(r:Rider):RaceInput{const p=this.course.project(r),target=this.course.at(p.s+5+Math.max(0,r.speed)*.25),ahead=this.course.at(p.s+12),corner=Math.abs(angleDelta(ahead.heading,p.heading)),heading=Math.atan2(target.x-r.x,target.z-r.z),turn=angleDelta(heading,r.heading);return{throttle:1,steer:clamp(turn*2.5,-1,1),brake:Math.abs(turn)>.6&&r.speed>9||corner>.55&&r.speed>8||corner>.25&&r.speed>12,gallop:Math.abs(turn)<.15&&corner<.25&&r.stamina>30,drift:false,item:Boolean(r.item)};}

 recover(r=this.player){const s=Math.max(0,r.gates*this.course.gateSpacing),p=this.course.at(s);Object.assign(r,p);r.lastS=s%this.course.length;r.progress=s;r.speed=0;r.slip=0;r.penalty+=5;r.boost=0;if(r===this.player)this.announce('Zur letzten Passage · +5 Sekunden');}
 private announce(message:string){this.message=message;this.eventSerial++;}
 step(input:RaceInput,delta:number){
  const dt=clamp(Number.isFinite(delta)?delta:0,0,1/30);if(this.phase==='paused'||this.phase==='finished'||this.phase==='ready')return;
  if(this.phase==='countdown'){this.countdown-=dt;if(this.countdown<=0){this.phase='racing';this.announce('Los!');}return;}
  this.elapsed+=dt;this.oil=this.oil.filter(p=>p.expires>this.elapsed);
  for(const [i,r]of this.riders.entries()){
   if(r.finish!==undefined)continue;const control=i?this.pilot(r):input,prev=this.course.project(r);
   // Reject discontinuous relocation before any progression can be credited.
   const relocation=Math.abs(((prev.s-r.lastS+this.course.length*1.5)%this.course.length)-this.course.length/2);if(relocation>10){this.recover(r);continue;}
   const off=Math.abs(prev.lateral)>this.variant.halfWidth,throttle=clamp(control.throttle,0,1),steer=clamp(control.steer,-1,1);
   r.boost=Math.max(0,r.boost-dt);r.slip=Math.max(0,r.slip-dt);
   const gallop=control.gallop&&r.stamina>1&&!off;r.stamina=clamp(r.stamina+(gallop?-22:10)*dt,0,100);
   const target=(r.slip>0?6:off?5:r.boost>0?25:gallop?20:14)*(i?(.96+i*.008):1);
   r.speed=clamp(r.speed+(throttle?7:-5)*dt-(control.brake?19*dt:0),0,target);
   const drifting=this.variant.mode==='arcade'&&control.drift&&r.speed>8&&Math.abs(steer)>.3&&!off;
   r.heading+=steer*(.45+Math.min(12,r.speed)*.08)*(drifting?1.2:1)*dt+(r.slip>0?Math.sin(this.elapsed*13)*.7*dt:0);
   if(drifting)r.driftCharge=clamp(r.driftCharge+dt,0,1.5);else if(r.driftCharge>0){if(r.driftCharge>.7){r.boost=1.3;if(!i)this.announce('Sauberer Kurvenritt · Galoppschub');}r.driftCharge=0;}
   r.x+=Math.sin(r.heading)*r.speed*dt;r.z+=Math.cos(r.heading)*r.speed*dt;
   const p=this.course.project(r);r.y=p.y;const advance=((p.s-prev.s+this.course.length*1.5)%this.course.length)-this.course.length/2;
   r.lastS=p.s;r.progress+=advance;
   if(Math.abs(p.lateral)>this.variant.halfWidth+7){this.recover(r);continue;}
   const next=(r.gates+1)*this.course.gateSpacing;
   if(r.progress>=next&&r.progress-next<4&&Math.abs(p.lateral)<=this.variant.halfWidth+1&&advance>0){r.gates++;if(!i)this.announce(r.gates%this.course.gateCount===0?'Runde geschafft':'Passage bestätigt');}
   if(r.progress>(r.gates+1)*this.course.gateSpacing+8&&r.gates<this.course.gateCount*this.variant.laps){this.recover(r);if(!i)this.announce('Passage verpasst · zurück zum letzten Tor · +5 Sekunden');continue;}
   if(r.gates>=this.course.gateCount*this.variant.laps){r.finish=this.elapsed+r.penalty;r.speed=0;if(!i){this.phase='finished';this.announce('Ziel erreicht');}continue;}
   const use=control.item&&(i>0||!this.previousItem);
   if(use&&r.item){if(r.item==='horseshoe'){r.boost=3;if(!i)this.announce('Glückshufeisen · Galopp frei');}else if(r.item==='tonic'){r.stamina=100;r.slip=0;if(!i)this.announce('Pferdetonikum · Ausdauer aufgefüllt');}else{this.oil.push({x:r.x-Math.sin(r.heading)*2,z:r.z-Math.cos(r.heading)*2,expires:this.elapsed+10});if(!i)this.announce('Ölspur abgelegt');}r.item=undefined;}
   if(this.variant.mode==='arcade'){
    for(const [j,pickup]of this.pickups.entries()){if(pickup.availableAt>this.elapsed||r.item)continue;const q=this.course.at(pickup.s),x=q.x+Math.cos(q.heading)*pickup.lane,z=q.z-Math.sin(q.heading)*pickup.lane;if(Math.hypot(r.x-x,r.z-z)<1.65){r.item=(['horseshoe','tonic','oil'] as RaceItem[])[(j+Math.floor(this.elapsed/8))%3];pickup.availableAt=this.elapsed+8;if(!i)this.announce('Satteltasche gefunden · E einsetzen');}}
    if(this.oil.some(o=>Math.hypot(r.x-o.x,r.z-o.z)<1.1)){r.slip=1.4;}
   }
  }
  if(this.variant.mode==='arcade')for(let i=0;i<this.riders.length;i++)for(let j=i+1;j<this.riders.length;j++){
   const a=this.riders[i],b=this.riders[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>0&&d<1.1){const push=(1.1-d)*.35;a.x-=dx/d*push;a.z-=dz/d*push;b.x+=dx/d*push;b.z+=dz/d*push;const slow=Math.min(a.speed,b.speed);a.speed+=(slow-a.speed)*.1;b.speed+=(slow-b.speed)*.1;}
  }
  this.previousItem=input.item;
 }
}
