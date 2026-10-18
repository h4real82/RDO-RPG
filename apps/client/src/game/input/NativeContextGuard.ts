/** Own only this surface; browser chrome and unrelated tabs keep their normal menu. */
export function bindNativeContextGuard(surface:EventTarget):()=>void {
 const guard=(event:Event)=>{try{if(!event)return;event.preventDefault();}catch(error){console.error('Could not suppress native game context menu.',error);}};
 const options={capture:true};surface.addEventListener('contextmenu',guard,options);return ()=>surface.removeEventListener('contextmenu',guard,options);
}
