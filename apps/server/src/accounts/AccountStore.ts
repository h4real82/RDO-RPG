import {BANK_CATALOG_VERSION,saleQuote} from './BankCatalog';
export interface QueryResult {rows:any[]}
export interface Db {query(text:string,values?:unknown[]):Promise<QueryResult>}
export interface Database extends Db {transaction<T>(run:(db:Db)=>Promise<T>):Promise<T>}
export interface AccountProfile {
 id:string; displayName:string; characterId:string; coins:string;
 inventory:{id:string;itemId:string;quantity:number;slot:number}[];
 discord:{id:string;name:string;avatar:string|null}|null;
}
export class AccountError extends Error {constructor(public code:string,public status=409){super(code);}}
export class AccountStore {
 constructor(public db:Database){}
 async ensureAccount(identity:{id:string;displayName:string}):Promise<AccountProfile>{
  const id=await this.db.transaction(async db=>{
   const row=(await db.query(`insert into public.player_profiles(auth_user_id,display_name) values($1,$2)
    on conflict(auth_user_id) do update set auth_user_id=excluded.auth_user_id returning account_id`,[identity.id,identity.displayName])).rows[0];
   const accountId=row.account_id;
   const character=(await db.query(`insert into public.characters(account_id,username) values($1,$2)
    on conflict(account_id) do nothing returning id`,[accountId,identity.displayName])).rows[0];
   if(character) await db.query(`insert into public.inventory_items(character_id,item_id,quantity,slot_index)
    values($1,'potion_red',3,0)`,[character.id]);
   await db.query('insert into public.coin_accounts(account_id) values($1) on conflict do nothing',[accountId]);
   await this.bookIn(db,accountId,'start-bonus',5000,'Einmaliger Startbonus');
   return accountId;
  });return this.profile(id);
 }
 async profile(accountId:string):Promise<AccountProfile>{
  const p=(await this.db.query(`select p.account_id,p.display_name,p.discord_id,p.discord_name,p.discord_avatar,
    c.id as character_id,w.balance::text from public.player_profiles p
    join public.characters c on c.account_id=p.account_id join public.coin_accounts w on w.account_id=p.account_id
    where p.account_id=$1`,[accountId])).rows[0];
  if(!p)throw new AccountError('profile_unavailable',503);
  const items=(await this.db.query('select id,item_id,quantity,slot_index from public.inventory_items where character_id=$1 order by slot_index,id',[p.character_id])).rows;
  return {id:p.account_id,displayName:p.display_name,characterId:p.character_id,coins:p.balance,
   inventory:items.map(i=>({id:i.id,itemId:i.item_id,quantity:i.quantity,slot:i.slot_index})),
   discord:p.discord_id?{id:p.discord_id,name:p.discord_name??p.display_name,avatar:p.discord_avatar}:null};
 }
 async rename(accountId:string,name:string){await this.db.query('update public.player_profiles set display_name=$2,updated_at=now() where account_id=$1',[accountId,name]);return this.profile(accountId);}
 private async bookIn(db:Db,id:string,event:string,amount:number,reason:string){
  if(!Number.isSafeInteger(amount))throw new AccountError('invalid_amount',400);
  await db.query('select account_id from public.coin_accounts where account_id=$1 for update',[id]);
  const old=(await db.query('select amount::text,reason from public.coin_entries where account_id=$1 and event_id=$2',[id,event])).rows[0];
  if(old){if(old.amount!==String(amount)||old.reason!==reason)throw new AccountError('event_conflict');return;}
  const updated=await db.query('update public.coin_accounts set balance=balance+$2::bigint where account_id=$1 and balance+$2::bigint>=0 returning account_id',[id,amount]);
  if(!updated.rows.length)throw new AccountError('insufficient_coins');
  await db.query('insert into public.coin_entries(account_id,event_id,amount,reason) values($1,$2,$3,$4)',[id,event,amount,reason]);
 }
 async book(id:string,event:string,amount:number,reason:string){await this.db.transaction(db=>this.bookIn(db,id,event,amount,reason));}
 async entries(id:string){return (await this.db.query('select event_id,amount::text,reason,created_at from public.coin_entries where account_id=$1 order by created_at desc,event_id limit 50',[id])).rows;}
 async consumeItem(id:string,itemId:string,event:string){
  await this.db.transaction(async db=>{
   await db.query('select account_id from public.player_profiles where account_id=$1 for update',[id]);
   const payload=JSON.stringify({itemId});
   const old=(await db.query('select payload from public.account_events where account_id=$1 and event_id=$2',[id,event])).rows[0];
   if(old){if(old.payload.kind || old.payload.itemId!==itemId)throw new AccountError('event_conflict');return;}
   const update=await db.query(`update public.inventory_items i set quantity=quantity-1 from public.characters c
    where i.id=$2 and c.id=i.character_id and c.account_id=$1 and i.quantity>0 returning i.id`,[id,itemId]);
   if(!update.rows.length)throw new AccountError('item_unavailable');
   await db.query('insert into public.account_events(account_id,event_id,payload) values($1,$2,$3::jsonb)',[id,event,payload]);
  });
 }
 async sellItem(id:string,itemId:string,event:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId) || !/^[a-zA-Z0-9_-]{8,100}$/.test(event))throw new AccountError('invalid_sale',400);
  await this.db.transaction(async db=>{
   await db.query('select account_id from public.player_profiles where account_id=$1 for update',[id]);
   const old=(await db.query('select payload from public.account_events where account_id=$1 and event_id=$2',[id,event])).rows[0];
   if(old){if(old.payload.kind!=='bank-sale' || old.payload.itemId!==itemId)throw new AccountError('event_conflict');return;}
   const item=(await db.query(`select i.item_id,i.quantity from public.inventory_items i join public.characters c on c.id=i.character_id
    where i.id=$2 and c.account_id=$1 for update of i`,[id,itemId])).rows[0];
   if(!item || item.quantity<1)throw new AccountError('item_unavailable');
   const quote=saleQuote(item.item_id);if(!quote)throw new AccountError('item_not_sellable');
   await db.query('update public.inventory_items set quantity=quantity-1 where id=$1',[itemId]);
   await this.bookIn(db,id,'bank-sale:'+event,quote.coins,'Bankverkauf '+item.item_id+' / '+BANK_CATALOG_VERSION);
   await db.query('insert into public.account_events(account_id,event_id,payload) values($1,$2,$3::jsonb)',[id,event,JSON.stringify({kind:'bank-sale',itemId,catalog:BANK_CATALOG_VERSION,coins:quote.coins})]);
  });return this.profile(id);
 }
 async createSession(hash:string,accountId:string,cipher:string,persistent:boolean,recovery=false){
  await this.db.query(`insert into public.app_sessions(token_hash,account_id,provider_cipher,persistent,expires_at,absolute_expires_at,recovery)
   values($1,$2,$3,$4,now()+case when $4 then interval '30 days' else interval '12 hours' end,
    now()+case when $4 then interval '90 days' else interval '12 hours' end,$5)`,[hash,accountId,cipher,persistent,recovery]);
 }
 async session(hash:string){
  return (await this.db.query(`update public.app_sessions set last_seen_at=now(),
   expires_at=least(absolute_expires_at,now()+case when persistent then interval '30 days' else interval '12 hours' end)
   where token_hash=$1 and expires_at>now() and absolute_expires_at>now() returning *`,[hash])).rows[0]??null;
 }
 async revoke(hash:string,all=false){if(all)await this.db.query('delete from public.app_sessions where account_id=(select account_id from public.app_sessions where token_hash=$1)',[hash]);else await this.db.query('delete from public.app_sessions where token_hash=$1',[hash]);}
 async linkDiscord(id:string,discord:{id:string;name:string;avatar:string|null}){
  try{await this.db.query('update public.player_profiles set discord_id=$2,discord_name=$3,discord_avatar=$4 where account_id=$1',[id,discord.id,discord.name,discord.avatar]);}
  catch(e){if((e as any).code==='23505')throw new AccountError('discord_already_linked');throw e;}
 }
 async unlinkDiscord(id:string){await this.db.query('update public.player_profiles set discord_id=null,discord_name=null,discord_avatar=null where account_id=$1 and auth_user_id is not null',[id]);}
 async acquireLease(id:string,session:string):Promise<number>{
  const r=await this.db.query(`insert into public.gameplay_leases(account_id,session_id,expires_at) values($1,$2,now()+interval '30 seconds')
   on conflict(account_id) do update set session_id=excluded.session_id,fence=gameplay_leases.fence+1,expires_at=excluded.expires_at
   where gameplay_leases.expires_at<=now() returning fence`,[id,session]);
  if(!r.rows.length)throw new AccountError('character_already_playing');return Number(r.rows[0].fence);
 }
 async checkpoint(id:string,session:string,fence:number,point:{x:number;y:number;z:number;mapVersion:string}){
  if(![point.x,point.y,point.z].every(Number.isFinite)||!point.mapVersion)throw new AccountError('invalid_checkpoint',400);
  const r=await this.db.query(`update public.gameplay_leases set checkpoint=$4::jsonb,expires_at=now()+interval '30 seconds'
   where account_id=$1 and session_id=$2 and fence=$3 and expires_at>now() returning account_id`,[id,session,fence,JSON.stringify(point)]);
  if(!r.rows.length)throw new AccountError('lease_expired');
 }
}
