import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { createAccountRouter, seal, unseal, hashToken } from './AccountHttp';

test('provider secrets are authenticated-encrypted and opaque session identifiers are hashed',()=>{
 const key=Buffer.alloc(32,7);const cipher=seal({refresh_token:'private'},key);
 assert.ok(!cipher.includes('private'));assert.deepEqual(unseal(cipher,key),{refresh_token:'private'});
 assert.throws(()=>unseal(cipher,Buffer.alloc(32,8)));
 assert.notEqual(hashToken('session-secret'),'session-secret');
});
test('unconfigured accounts fail closed and mutations require trusted origin',async()=>{
 const app=express();app.use(express.json());
 app.use('/api',createAccountRouter({origin:'http://localhost:4180'}));
 const server=createServer(app);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const port=(server.address() as any).port;
 try{
  const r=await fetch(`http://127.0.0.1:${port}/api/me`);assert.equal(r.status,503);
  const cross=await fetch(`http://127.0.0.1:${port}/api/auth/login`,{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json','x-rdo-request':'1'},body:'{}'});
  assert.equal(cross.status,403);assert.equal(cross.headers.get('set-cookie'),null);
  const own=await fetch(`http://127.0.0.1:${port}/api/auth/login`,{method:'POST',headers:{origin:'http://localhost:4180','content-type':'application/json','x-rdo-request':'1'},body:'{}'});
  assert.equal(own.status,503);
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
