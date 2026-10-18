import {BANK_CATALOG,BANK_CATALOG_VERSION} from './BankCatalog';
import { Router, Request, Response, NextFunction } from 'express';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { createClient, type Session, type User } from '@supabase/supabase-js';
import { AccountStore, AccountError } from './AccountStore';

export const hashToken=(value:string)=>createHash('sha256').update(value).digest('hex');
export function seal(value:unknown,key:Buffer):string {
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
export function unseal(value:string,key:Buffer):any {
 const b=Buffer.from(value,'base64url'),cipher=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));
 cipher.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString('utf8'));
}
export interface AccountConfig {
 origin:string; supabaseUrl?:string; publishableKey?:string; encryptionKey?:Buffer; store?:AccountStore;
 discordClientId?:string;discordSecret?:string;fetch?:typeof fetch;
}
const cookieName='rdo_session';
function token(req:Request):string {const m=(req.headers.cookie??'').match(/(?:^|;\s*)rdo_session=([A-Za-z0-9_-]{43})(?:;|$)/);return m?.[1]??'';}
function text(value:unknown,min:number,max:number):string {if(typeof value!=='string'||value.trim().length<min||value.length>max)throw new AccountError('invalid_input',400);return value.trim();}
function password(value:unknown):string{if(typeof value!=='string'||value.length<12||value.length>128)throw new AccountError('password_length',400);return value;}
function existingPassword(value:unknown):string{if(typeof value!=='string'||value.length<1||value.length>128)throw new AccountError('invalid_input',400);return value;}
function email(value:unknown):string{const v=text(value,3,254);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new AccountError('invalid_email',400);return v;}
export function createAccountRouter(config:AccountConfig):Router {
 const router=Router(),store=config.store,key=config.encryptionKey;
 const available=Boolean(store&&key?.length===32&&config.supabaseUrl&&config.publishableKey);
 const provider=()=>createClient(config.supabaseUrl!,config.publishableKey!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>(config.fetch??fetch)(input,{...init,signal:AbortSignal.timeout(8000)})}});
 const secure=new URL(config.origin).protocol==='https:';
 const cookie=(res:Response,value:string,persistent=false)=>res.cookie(cookieName,value,{httpOnly:true,secure,sameSite:'lax',path:'/api',...(persistent?{maxAge:90*86400000}:{})});
 const clear=(res:Response)=>res.clearCookie(cookieName,{httpOnly:true,secure,sameSite:'lax',path:'/api'});
 const counts=new Map<string,{count:number;until:number}>();
 router.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  if(!['GET','HEAD'].includes(req.method) && (req.get('origin')!==config.origin||req.get('x-rdo-request')!=='1'))return res.status(403).json({error:'untrusted_request'});
  if(req.path==='/auth/capabilities' && req.method==='GET')return res.json({accounts:available,discordLink:available&&Boolean(config.discordClientId&&config.discordSecret)});
  if(!available)return res.status(503).json({error:'accounts_unavailable'});
  if(req.method==='POST'){
   const now=Date.now();for(const [id,v]of counts)if(v.until<now)counts.delete(id);
   const id=req.ip??'unknown',v=counts.get(id)??{count:0,until:now+60000};
   if(counts.size>=10000&&!counts.has(id))return res.status(429).json({error:'rate_limited'});
   if(++v.count>30)return res.status(429).json({error:'rate_limited'});counts.set(id,v);
  }next();
 });
 const route=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{void fn(req,res).catch(next);};
 async function openSession(req:Request,res:Response,session:Session,user:User,remember:boolean,recovery=false){
  if(!user.email_confirmed_at)throw new AccountError('email_unverified',403);
  const proposed=user.user_metadata?.display_name??user.user_metadata?.full_name??'Outlaw';
  const account=await store!.ensureAccount({id:user.id,displayName:typeof proposed==='string'&&proposed.trim()?proposed.trim().slice(0,80):'Outlaw'});
  const value=randomBytes(32).toString('base64url');
  if(token(req))await store!.revoke(hashToken(token(req)));
  await store!.createSession(hashToken(value),account.id,seal({access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at,userId:user.id,reauthAt:Date.now()},key!),remember,recovery);
  cookie(res,value,remember);return account;
 }
 async function requireSession(req:Request,allowRecovery=false):Promise<any>{
  const value=token(req);if(!value)throw new AccountError('sign_in_required',401);
  const hash=hashToken(value),row=await store!.session(hash);
  if(!row)throw new AccountError('sign_in_required',401);
  if(row.recovery&&!allowRecovery)throw new AccountError('password_update_required',403);
  // Row lock serializes provider refresh across tabs AND server processes.
  return store!.db.transaction(async db=>{
   const live=(await db.query('select * from public.app_sessions where token_hash=$1 and expires_at>now() and absolute_expires_at>now() for update',[hash])).rows[0];
   if(!live)throw new AccountError('sign_in_required',401);
   let session=unseal(live.provider_cipher,key!);const auth=provider();
   if(!session.expires_at||session.expires_at*1000<Date.now()+30000){
    const refreshed=await auth.auth.refreshSession({refresh_token:session.refresh_token});
    if(refreshed.error||!refreshed.data.session){
     if(!refreshed.error?.status||refreshed.error.status>=500)throw new AccountError('accounts_unavailable',503);
     throw new AccountError('sign_in_required',401);
    }
    if(refreshed.data.user?.id!==session.userId)throw new AccountError('sign_in_required',401);
    session={...session,access_token:refreshed.data.session.access_token,refresh_token:refreshed.data.session.refresh_token,expires_at:refreshed.data.session.expires_at};
    await db.query('update public.app_sessions set provider_cipher=$2 where token_hash=$1',[hash,seal(session,key!)]);
   }
   const checked=await auth.auth.getUser(session.access_token);
   if(checked.error||checked.data.user?.id!==session.userId){if(checked.error?.status&&checked.error.status<500)throw new AccountError('sign_in_required',401);throw new AccountError('accounts_unavailable',503);}
   const owner=(await db.query('select auth_user_id from public.player_profiles where account_id=$1',[live.account_id])).rows[0];
   if(owner?.auth_user_id!==session.userId)throw new AccountError('sign_in_required',401);
   return {...live,hash,providerSession:session,user:checked.data.user};
  });
 }
 router.post('/auth/register',route(async(req,res)=>{
  const name=text(req.body?.displayName,1,80),address=email(req.body?.email),pass=password(req.body?.password);
  const r=await provider().auth.signUp({email:address,password:pass,options:{data:{display_name:name},emailRedirectTo:config.origin+'/?account=verify'}});
  if(r.error)throw new AccountError('registration_failed',400);
  // Confirmation is mandatory for this application's registration contract.
  res.status(202).json({state:'verification-required'});
 }));
 router.post('/auth/login',route(async(req,res)=>{
  const address=email(req.body?.email),pass=existingPassword(req.body?.password);
  const r=await provider().auth.signInWithPassword({email:address,password:pass});
  if(r.error||!r.data.session||!r.data.user)throw new AccountError('invalid_credentials',401);
  const profile=await openSession(req,res,r.data.session,r.data.user,req.body?.remember===true);
  res.json({profile});
 }));
 router.post('/auth/verify',route(async(req,res)=>{
  const type=req.body?.type;if(type!=='email'&&type!=='recovery')throw new AccountError('invalid_input',400);
  // Supabase's generic `email` verification also accepts recovery tokens.
  // Restrict confirmation to signup tokens so a caller cannot relabel a reset link.
  const result=await provider().auth.verifyOtp({token_hash:text(req.body?.tokenHash,16,512),type:type==='email'?'signup':'recovery'});
  if(result.error||!result.data.session||!result.data.user)throw new AccountError('verification_failed',400);
  const profile=await openSession(req,res,result.data.session,result.data.user,true,type==='recovery');
  res.json({profile: type==='recovery'?null:profile,state:type==='recovery'?'password-update':'authenticated'});
 }));
 router.post('/auth/password-reset',route(async(req,res)=>{
  const r=await provider().auth.resetPasswordForEmail(email(req.body?.email),{redirectTo:config.origin+'/?account=recovery'});
  if(r.error&&(!r.error.status||r.error.status>=500))throw new AccountError('accounts_unavailable',503);
  res.json({state:'reset-requested'});
 }));
 router.post('/auth/password-update',route(async(req,res)=>{
  const row=await requireSession(req,true),pass=password(req.body?.password),auth=provider();
  if(!row.recovery){const check=await auth.auth.signInWithPassword({email:row.user.email,password:existingPassword(req.body?.currentPassword)});if(check.error)throw new AccountError('invalid_credentials',401);}
  const restored=await auth.auth.setSession({access_token:row.providerSession.access_token,refresh_token:row.providerSession.refresh_token});
  if(restored.error)throw new AccountError('sign_in_required',401);
  const update=await auth.auth.updateUser({password:pass});if(update.error)throw new AccountError('password_update_failed',400);
  await store!.revoke(row.hash,true);clear(res);res.json({state:'signed-out'});
 }));
 for(const all of [false,true]) router.post(all?'/auth/logout-all':'/auth/logout',route(async(req,res)=>{
  if(all)await requireSession(req,true);if(token(req))await store!.revoke(hashToken(token(req)),all);clear(res);res.json({state:'signed-out'});
 }));
 router.get('/me',route(async(req,res)=>{const s=await requireSession(req);res.json({profile:await store!.profile(s.account_id),capabilities:{password:true,discordLink:Boolean(config.discordClientId&&config.discordSecret),persistentGameplay:false,discordSessions:false}});}));
 router.patch('/me',route(async(req,res)=>{const s=await requireSession(req);res.json({profile:await store!.rename(s.account_id,text(req.body?.displayName,1,80))});}));
 router.get('/me/inventory',route(async(req,res)=>{const s=await requireSession(req);res.json({inventory:(await store!.profile(s.account_id)).inventory});}));
 router.get('/me/wallet',route(async(req,res)=>{const s=await requireSession(req);res.json({coins:(await store!.profile(s.account_id)).coins});}));
 router.get('/me/bank',route(async(req,res)=>{const s=await requireSession(req);res.json({profile:await store!.profile(s.account_id),catalog:BANK_CATALOG,catalogVersion:BANK_CATALOG_VERSION});}));
 router.post('/me/bank/sell',route(async(req,res)=>{const s=await requireSession(req);res.json({profile:await store!.sellItem(s.account_id,text(req.body?.itemId,36,36),text(req.body?.requestId,8,100))});}));
 router.get('/me/wallet/entries',route(async(req,res)=>{const s=await requireSession(req);res.json({entries:await store!.entries(s.account_id)});}));
 router.post('/discord/link/start',route(async(req,res)=>{
  const s=await requireSession(req);if(!config.discordClientId||!config.discordSecret)throw new AccountError('discord_unavailable',503);
  const state=randomBytes(32).toString('base64url');await store!.db.query('delete from public.discord_link_flows where expires_at<=now()');
  await store!.db.query('insert into public.discord_link_flows(state_hash,token_hash) values($1,$2)',[hashToken(state),s.hash]);
  const q=new URLSearchParams({client_id:config.discordClientId,response_type:'code',scope:'identify',redirect_uri:config.origin+'/api/discord/link/callback',state});
  res.json({url:'https://discord.com/oauth2/authorize?'+q});
 }));
 router.get('/discord/link/callback',route(async(req,res)=>{
  const s=await requireSession(req),state=text(req.query.state,16,200),code=text(req.query.code,1,512);
  if(req.query.iss!=='https://discord.com')throw new AccountError('invalid_oauth_issuer',400);
  const flow=await store!.db.query('delete from public.discord_link_flows where state_hash=$1 and token_hash=$2 and expires_at>now() returning state_hash',[hashToken(state),s.hash]);
  if(!flow.rows.length)throw new AccountError('invalid_oauth_state',400);
  const r=await fetch('https://discord.com/api/oauth2/token',{method:'POST',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.discordClientId!,client_secret:config.discordSecret!,grant_type:'authorization_code',code,redirect_uri:config.origin+'/api/discord/link/callback'})});
  if(!r.ok)throw new AccountError('discord_link_failed',400);const data=await r.json() as any;
  const userResponse=await fetch('https://discord.com/api/users/@me',{headers:{Authorization:'Bearer '+data.access_token},signal:AbortSignal.timeout(8000)});
  if(!userResponse.ok)throw new AccountError('discord_link_failed',400);const u=await userResponse.json() as any;
  if(typeof u.id!=='string'||!/^\d{17,20}$/.test(u.id))throw new AccountError('discord_link_failed',400);
  await store!.linkDiscord(s.account_id,{id:u.id,name:String(u.global_name??u.username??'Discord').slice(0,80),avatar:typeof u.avatar==='string'?u.avatar:null});
  res.redirect(303,config.origin+'/?account=profile');
 }));
 router.post('/discord/unlink',route(async(req,res)=>{
  const s=await requireSession(req);
  const checked=await provider().auth.signInWithPassword({email:s.user.email,password:existingPassword(req.body?.password)});
  if(checked.error||checked.data.user?.id!==s.user.id)throw new AccountError('invalid_credentials',401);
  await store!.unlinkDiscord(s.account_id);res.json({profile:await store!.profile(s.account_id)});
 }));
 router.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  const known=error instanceof AccountError;if(known&&error.status===401)clear(res);
  res.status(known?error.status:503).json({error:known?error.code:'accounts_unavailable'});
 });
 return router;
}
