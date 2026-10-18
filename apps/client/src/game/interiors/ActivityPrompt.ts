export function placeActivityPrompt(point:{x:number;y:number},viewport:{width:number;height:number}){
 const half=76,offset=100;
 const right=point.x+offset+half<viewport.width-12;
 return {x:Math.max(half+12,Math.min(viewport.width-half-12,point.x+(right?offset:-offset))),y:Math.max(34,point.y-60)};
}
