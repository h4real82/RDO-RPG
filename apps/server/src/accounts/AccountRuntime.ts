import { Pool } from 'pg';
import { AccountStore, type Database } from './AccountStore';
import { createAccountRouter } from './AccountHttp';

export function accountRuntime(){
 const origin=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:4180';
 const url=process.env.SUPABASE_URL,publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY;
 const encryptionKey=Buffer.from(process.env.ACCOUNT_SESSION_KEY??'','base64');
 const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000,statement_timeout:10000}):null;
 pool?.on('error',()=>{try{console.error('Account database connection unavailable.');}catch{/* No logging failure may terminate the server. */}});
 const db:Database|undefined=pool?{query:(sql,values)=>pool.query(sql,values),transaction:async run=>{
  const connection=await pool.connect();try{await connection.query('begin');const result=await run({query:(sql,values)=>connection.query(sql,values)});await connection.query('commit');return result;}
  catch(error){await connection.query('rollback');throw error;}finally{connection.release();}
 }}:undefined;
 const store=db?new AccountStore(db):undefined;
 return {store,pool,router:createAccountRouter({origin,supabaseUrl:url,publishableKey,encryptionKey,store,
  discordClientId:process.env.DISCORD_CLIENT_ID??process.env.VITE_DISCORD_CLIENT_ID,discordSecret:process.env.DISCORD_CLIENT_SECRET})};
}
