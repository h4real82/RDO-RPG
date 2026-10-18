import {expect,it} from 'vitest';import {bindNativeContextGuard} from './NativeContextGuard';
it('blocks native context menus on the owned surface and removes the listener on disposal',()=>{
 const surface=new EventTarget();const stop=bindNativeContextGuard(surface);const event=new Event('contextmenu',{cancelable:true});surface.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);stop();const after=new Event('contextmenu',{cancelable:true});surface.dispatchEvent(after);expect(after.defaultPrevented).toBe(false);
});
