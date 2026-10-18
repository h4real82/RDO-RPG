import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const child=spawn(process.execPath,['apps/server/dist/index.js'],{cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(port),DATABASE_URL:'',SUPABASE_URL:'',SUPABASE_PUBLISHABLE_KEY:'',ACCOUNT_SESSION_KEY:''}});
let output='';child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});
try{
 let ready=false;for(let i=0;i<100;i++){if(output.includes('Listening on')){ready=true;break;}if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,'Built server must start: '+output);
 const root='http://127.0.0.1:'+port;
 assert.equal((await fetch(root+'/health')).status,200);
 const caps=await (await fetch(root+'/api/auth/capabilities')).json();assert.equal(caps.accounts,false);
 assert.equal((await fetch(root+'/api/me')).status,503);
 console.log('Built Node server starts; health200; unconfigured account capabilities false; profile503: PASS');
}finally{child.kill();}
