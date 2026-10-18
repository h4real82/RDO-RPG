import { describe,it,expect } from 'vitest';
import { AccountController } from './AccountController';
describe('account browser state',()=>{
 it('distinguishes unavailable service from signed out and never creates a zero profile',async()=>{
  const c=new AccountController(()=>{},async()=>new Response('{}',{status:503}));await c.load();expect(c.state).toBe('unavailable');expect(c.profile).toBeNull();
  const guest=new AccountController(()=>{},async input=>String(input).endsWith('capabilities')?Response.json({accounts:true}):new Response('{}',{status:401}));await guest.load();expect(guest.state).toBe('signed-out');expect(guest.capabilities.accounts).toBe(true);expect(guest.profile).toBeNull();
 });
 it('ignores late account results after disposal',async()=>{
  let done!:(r:Response)=>void;const c=new AccountController(()=>{},()=>new Promise(r=>{done=r;}));const pending=c.action('/auth/login',{});c.dispose();done(Response.json({profile:{id:'late',coins:'5000'}}));await pending;expect(c.profile).toBeNull();
 });
 it('does not reset a confirmed profile on a transient read failure',async()=>{
  let fail=false;const c=new AccountController(()=>{},async input=>String(input).endsWith('capabilities')?Response.json({accounts:true}):fail?new Response('{}',{status:503}):Response.json({profile:{id:'one',displayName:'Martha',coins:'5000',inventory:[]},capabilities:{}}));
  await c.load();fail=true;await c.load();expect(c.state).toBe('unavailable');expect(c.profile?.id).toBe('one');
 });
});
