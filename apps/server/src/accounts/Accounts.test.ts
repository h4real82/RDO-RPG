import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { AccountStore } from './AccountStore';
import express from 'express';
import { createServer } from 'node:http';
import { createAccountRouter } from './AccountHttp';

const storeFor=(db:PGlite)=>new AccountStore({query:async(text,values)=>db.query(text,values as any[]),transaction:async(run)=>db.transaction(async tx=>run({query:async(text,values)=>tx.query(text,values as any[])}))});
async function fixture(prepared=true,dataDir?:string) {
  const db=new PGlite({dataDir,extensions:{pgcrypto,pg_trgm}});
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema extensions; set search_path=public,extensions');
  const folder=resolve(__dirname,'../../../../supabase/migrations');
  const names=(await readdir(folder)).filter(n=>n.endsWith('.sql')).sort();
  for(const name of names.filter(n=>n<'20261018151227' && (prepared || !n.includes('relational_player_state')))) await db.exec(await readFile(resolve(folder,name),'utf8'));
  const migration=names.find(n=>n.includes('player_accounts'))!;
  await db.exec(await readFile(resolve(folder,migration),'utf8'));
  for(const name of names.filter(n=>n>'20261018151227_player_accounts.sql')) await db.exec(await readFile(resolve(folder,name),'utf8'));
  const store=storeFor(db);
  return {db,store};
}
for(const prepared of [true,false]) test(`account persists, bonus and inventory bootstrap only once; prepared=${prepared}`,async()=>{
  const {db,store}=await fixture(prepared);
  try {
    const identity={id:'00000000-0000-4000-8000-000000000111',displayName:'Martha'};
    const a=await store.ensureAccount(identity);
    const b=await store.ensureAccount(identity);
    assert.equal(a.id,b.id);assert.equal(a.coins,'5000');assert.equal(b.coins,'5000');
    assert.equal(a.characterId,b.characterId);
    assert.equal((await db.query('select * from public.coin_entries')).rows.length,1);
    await assert.rejects(db.query('update public.coin_entries set amount=1'));
    await assert.rejects(db.query('delete from public.coin_entries'));
    assert.equal(a.inventory[0].quantity,3);
    await store.consumeItem(a.id,a.inventory[0].id,'consume-one');
    await store.consumeItem(a.id,a.inventory[0].id,'consume-one');
    assert.equal((await store.profile(a.id)).inventory[0].quantity,2);
    const other=await store.ensureAccount({id:'00000000-0000-4000-8000-000000000222',displayName:'Other'});
    await assert.rejects(store.consumeItem(other.id,a.inventory[0].id,'steal'));
    assert.equal((await store.profile(a.id)).inventory[0].quantity,2);
    await assert.rejects(store.book(a.id,'start-bonus',1,'changed payload'));
    await assert.rejects(store.book(a.id,'overspend',-5001,'spend'));
    assert.equal((await store.profile(a.id)).coins,'5000');
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.player_profiles'));
    await assert.rejects(db.query('select * from public.coin_accounts'));
    await db.exec('reset role');
  } finally {await db.close();}
});
test('disk-backed database restores the same profile, consumed item and ledger after restart',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'rdo-accounts-'));
 let db:PGlite|undefined;
 try{
  const first=await fixture(true,folder);db=first.db;
  const a=await first.store.ensureAccount({id:'00000000-0000-4000-8000-000000000444',displayName:'Persistent'});
  await first.store.consumeItem(a.id,a.inventory[0].id,'use-before-restart');
  await first.store.book(a.id,'earned-before-restart',25,'Test reward');
  await db.close();db=undefined;
  db=new PGlite({dataDir:folder,extensions:{pgcrypto,pg_trgm}});
  const restored=await storeFor(db).profile(a.id);
  assert.equal(restored.characterId,a.characterId);assert.equal(restored.coins,'5025');assert.equal(restored.inventory[0].quantity,2);
  const again=await storeFor(db).ensureAccount({id:'00000000-0000-4000-8000-000000000444',displayName:'Changed provider name'});
  assert.equal(again.id,a.id);assert.equal(again.coins,'5025');
 }finally{
  await db?.close();
  const safe=resolve(folder);if(!safe.startsWith(resolve(tmpdir())+sep)||!safe.includes('rdo-accounts-'))throw new Error('Unexpected fixture folder');
  await rm(safe,{recursive:true,force:true});
 }
});
test('email login uses an opaque persistent cookie, restores one profile and revokes logout',async()=>{
 const {db,store}=await fixture();
 const user={id:'00000000-0000-4000-8000-000000000333',email:'player@example.org',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{display_name:'Mail Cowboy'},identities:[{provider:'email'}]};
 const payload=Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
 const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.c2lnbmF0dXJl',refresh_token:'provider-refresh-secret',expires_in:3600,token_type:'bearer',user};
 const fakeFetch:typeof fetch=async(input,init)=>{
  const url=String(input);
  if(url.includes('/token?grant_type=password')){const body=JSON.parse(String(init?.body));if(body.password!=='correct-password')return Response.json({msg:'invalid',error_code:'invalid_credentials'},{status:400});return Response.json(session);}
  if(url.endsWith('/user')){if(init?.method==='PUT'){const body=JSON.parse(String(init.body));assert.equal(body.password,'new-correct-password');}return Response.json(user);}
  if(url.includes('/recover'))return Response.json({});
  if(url.endsWith('/verify')){const body=JSON.parse(String(init?.body));if(body.token_hash==='recovery-token-hash'&&body.type==='signup')return Response.json({msg:'wrong token purpose'},{status:403});return Response.json(session);}
  if(url.includes('/signup'))return Response.json({user,session:null});
  throw new Error('Unexpected provider endpoint');
 };
 const app=express();app.use(express.json());app.use('/api',createAccountRouter({origin:'http://localhost:4180',supabaseUrl:'https://auth.example.org',publishableKey:'test-public-key',encryptionKey:Buffer.alloc(32,7),store,fetch:fakeFetch}));
 const server=createServer(app);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+(server.address() as any).port;
 const headers={'content-type':'application/json',origin:'http://localhost:4180','x-rdo-request':'1'};
 try{
  const login=async(password='correct-password')=>fetch(base+'/api/auth/login',{method:'POST',headers,body:JSON.stringify({email:user.email,password,remember:true})});
  assert.equal((await login('wrong')).status,401);
  const signIn=await login();assert.equal(signIn.status,200);
  const cookie=signIn.headers.getSetCookie().find(v=>v.startsWith('rdo_session='))!;assert.ok(cookie.includes('HttpOnly'));assert.ok(cookie.includes('SameSite=Lax'));assert.ok(!cookie.includes('provider-refresh'));
  const own=await fetch(base+'/api/me',{headers:{cookie:cookie.split(';')[0]}});assert.equal(own.status,200);const a=await own.json() as any;assert.equal(a.profile.coins,'5000');assert.equal(a.profile.displayName,'Mail Cowboy');assert.equal(a.capabilities.password,true);
  const anotherLogin=await login();assert.equal((await anotherLogin.json() as any).profile.id,a.profile.id);
  assert.equal((await fetch(base+'/api/me/inventory?account_id=someone-else',{headers:{cookie:cookie.split(';')[0]}})).status,200);
  const wrongPurpose=await fetch(base+'/api/auth/verify',{method:'POST',headers,body:JSON.stringify({tokenHash:'recovery-token-hash',type:'email'})});assert.equal(wrongPurpose.status,400);
  const recovery=await fetch(base+'/api/auth/verify',{method:'POST',headers,body:JSON.stringify({tokenHash:'recovery-token-hash',type:'recovery'})});assert.equal(recovery.status,200);
  const recoveryCookie=recovery.headers.getSetCookie().find(v=>v.startsWith('rdo_session='))!;
  assert.equal((await fetch(base+'/api/me',{headers:{cookie:recoveryCookie.split(';')[0]}})).status,403);
  assert.equal((await fetch(base+'/api/auth/password-reset',{method:'POST',headers,body:JSON.stringify({email:user.email})})).status,200);
  const updated=await fetch(base+'/api/auth/password-update',{method:'POST',headers:{...headers,cookie:recoveryCookie.split(';')[0]},body:JSON.stringify({password:'new-correct-password'})});assert.equal(updated.status,200);
  assert.equal((await fetch(base+'/api/me',{headers:{cookie:recoveryCookie.split(';')[0]}})).status,401);
  assert.equal((await fetch(base+'/api/me',{headers:{cookie:cookie.split(';')[0]}})).status,401);
  assert.equal((await db.query('select * from public.player_profiles')).rows.length,1);assert.equal((await db.query('select * from public.coin_entries')).rows.length,1);
  const bankCookie=(await login()).headers.getSetCookie().find(v=>v.startsWith('rdo_session='))!.split(';')[0];
  const bank=await fetch(base+'/api/me/bank',{headers:{cookie:bankCookie}});assert.equal(bank.status,200);
  const bankData=await bank.json() as any;const saleHeaders={...headers,cookie:bankCookie};
  assert.equal((await fetch(base+'/api/me/bank/sell',{method:'POST',headers:{...saleHeaders,origin:'https://evil.example'},body:JSON.stringify({itemId:bankData.profile.inventory[0].id,requestId:'http-sale-one'})})).status,403);
  const sell=()=>fetch(base+'/api/me/bank/sell',{method:'POST',headers:saleHeaders,body:JSON.stringify({itemId:bankData.profile.inventory[0].id,requestId:'http-sale-one',coins:999999,accountId:'foreign'})});
  assert.equal((await sell()).status,200);const retry=await sell();assert.equal((await retry.json() as any).profile.coins,'5025');
  assert.equal((await fetch(base+'/api/me/bank/sell',{method:'POST',headers:saleHeaders,body:JSON.stringify({itemId:'invalid',requestId:'http-sale-malformed'})})).status,400);
  const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{...headers,cookie:cookie.split(';')[0]},body:'{}'});assert.equal(logout.status,200);
  assert.equal((await fetch(base+'/api/me',{headers:{cookie:cookie.split(';')[0]}})).status,401);
 }finally{await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
test('session expiry, Discord uniqueness and gameplay fencing survive repository recreation',async()=>{
  const {db,store}=await fixture();
  try {
    const a=await store.ensureAccount({id:'00000000-0000-4000-8000-000000000111',displayName:'A'});
    const b=await store.ensureAccount({id:'00000000-0000-4000-8000-000000000222',displayName:'B'});
    await store.linkDiscord(a.id,{id:'123456789012345678',name:'Discord A',avatar:null});
    await assert.rejects(store.linkDiscord(b.id,{id:'123456789012345678',name:'Imposter',avatar:null}));
    assert.equal((await store.profile(a.id)).discord?.name,'Discord A');
    await store.createSession('hashed-token',a.id,'encrypted-provider',false);
    assert.equal((await store.session('hashed-token'))?.account_id,a.id);
    await db.exec("update public.app_sessions set expires_at=now()-interval '1 second'");
    assert.equal(await store.session('hashed-token'),null);
    const lease=await store.acquireLease(a.id,'session-a');
    await assert.rejects(store.acquireLease(a.id,'session-b'));
    await db.exec("update public.gameplay_leases set expires_at=now()-interval '1 second'");
    const next=await store.acquireLease(a.id,'session-b');
    assert.ok(next>lease);
    await assert.rejects(store.checkpoint(a.id,'session-a',lease,{x:1,y:2,z:3,mapVersion:'test'}));
    await store.checkpoint(a.id,'session-b',next,{x:1,y:2,z:3,mapVersion:'test'});
    assert.equal((await db.query<{checkpoint:{x:number}}>('select checkpoint from public.gameplay_leases')).rows[0].checkpoint.x,1);
  } finally {await db.close();}
});

 test('bank sales are owned, atomic, server priced and retry-safe',async()=>{
 const {db,store}=await fixture();try{
 const a=await store.ensureAccount({id:'00000000-0000-4000-8000-000000000411',displayName:'Seller'});
 const b=await store.ensureAccount({id:'00000000-0000-4000-8000-000000000422',displayName:'Other'});
 const item=a.inventory[0].id;
 await assert.rejects(store.sellItem(b.id,item,'foreign-sale'));
 await store.sellItem(a.id,item,'sale-one');await store.sellItem(a.id,item,'sale-one');
 let profile=await store.profile(a.id);assert.equal(profile.coins,'5025');assert.equal(profile.inventory[0].quantity,2);
 await assert.rejects(store.consumeItem(a.id,item,'sale-one'));
 await store.consumeItem(a.id,item,'eat-one');await assert.rejects(store.sellItem(a.id,item,'eat-one'));
 await store.sellItem(a.id,item,'sale-last');await assert.rejects(store.sellItem(a.id,item,'empty'));
 assert.equal((await store.profile(a.id)).coins,'5050');
 await db.query("update public.inventory_items set quantity=1,item_id='wooden_sword' where id=$1",[item]);
 await assert.rejects(store.sellItem(a.id,item,'unknown'));
 await db.query("update public.inventory_items set item_id='potion_red' where id=$1",[item]);
 await store.book(a.id,'bank-sale:rollback-sale',1,'forced conflict');
 await assert.rejects(store.sellItem(a.id,item,'rollback-sale'));
 assert.equal((await store.profile(a.id)).inventory[0].quantity,1);
 const attempts=await Promise.allSettled([store.sellItem(a.id,item,'race-sale-a'),store.sellItem(a.id,item,'race-sale-b')]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 await db.query('update public.inventory_items set quantity=1 where id=$1',[item]);
 assert.equal((await store.profile(a.id)).inventory[0].quantity,1);
 assert.equal((await store.profile(a.id)).coins,'5076');
 }finally{await db.close();}
 });
