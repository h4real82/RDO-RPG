import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createHandoff,verifyHandoff,ownershipStatus} from './gemini-handoff.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function fixture(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rdo-handoff-test-'));
 t.after(async()=>{assert.ok(path.isAbsolute(dir)&&path.basename(dir).startsWith('rdo-handoff-test-'));await fs.rm(dir,{recursive:true,force:true});});
 const source=path.join(dir,'repo'),outputRoot=path.join(dir,'backups');await fs.mkdir(source);
 const git=(...args)=>execFileSync('git',['-C',source,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 git('init');git('config','user.email','fixture@example.invalid');git('config','user.name','Fixture');
 await fs.writeFile(path.join(source,'a.txt'),'base');await fs.writeFile(path.join(source,'deleted.txt'),'remove me');git('add','--','a.txt','deleted.txt');git('commit','-m','base');
 return {dir,source,outputRoot,git};
}
test('preserves distinct staged/working/untracked files and deletion metadata without changing Git',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.source,'a.txt'),'staged');f.git('add','--','a.txt');await fs.writeFile(path.join(f.source,'a.txt'),'working');
 await fs.writeFile(path.join(f.source,'new.txt'),'new');await fs.unlink(path.join(f.source,'deleted.txt'));
 const before=f.git('status','--porcelain=v1','-z');const result=await createHandoff(f);const m=result.manifest;
 assert.equal(await fs.readFile(path.join(result.directory,'working/a.txt'),'utf8'),'working');
 assert.equal(await fs.readFile(path.join(result.directory,'index/a.txt'),'utf8'),'staged');
 assert.equal(await fs.readFile(path.join(result.directory,'working/new.txt'),'utf8'),'new');
 assert.ok(m.deleted.includes('deleted.txt'));assert.equal(f.git('status','--porcelain=v1','-z'),before);
 assert.equal((await ownershipStatus(f.source)).owner,'codex');assert.equal((await verifyHandoff(result.directory,{live:true})).ok,true);
});
test('excludes sensitive names/content and local binary stores even if tracked',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.source,'.env'),'TOKEN=private-fixture');
 await fs.writeFile(path.join(f.source,'leak.ts'),'const apiKey="sk-proj-'+ 'x'.repeat(35)+'";');
 await fs.mkdir(path.join(f.source,'data/runtime'),{recursive:true});await fs.writeFile(path.join(f.source,'data/runtime/model.bin'),'asset');
 f.git('add','-f','--','.env','leak.ts','data/runtime/model.bin');const r=await createHandoff(f);
 for(const name of ['.env','leak.ts','data/runtime/model.bin'])assert.ok(r.manifest.excluded.some(x=>x.path===name),name);
 assert.equal(r.manifest.files.some(x=>['.env','leak.ts','data/runtime/model.bin'].includes(x.path)),false);
});
test('rejects output inside source and symlink aliases into source',async t=>{
 const f=await fixture(t);await assert.rejects(createHandoff({...f,outputRoot:path.join(f.source,'backup')}),/outside|außerhalb/i);
 const alias=path.join(f.dir,'alias');await fs.symlink(f.source,alias,process.platform==='win32'?'junction':'dir');
 await assert.rejects(createHandoff({...f,outputRoot:path.join(alias,'backup')}),/outside|außerhalb/i);
});
test('never follows a junction to files outside the source tree',async t=>{
 const f=await fixture(t);const external=path.join(f.dir,'external');await fs.mkdir(external);await fs.writeFile(path.join(external,'private.txt'),'must not export');
 await fs.symlink(external,path.join(f.source,'linked'),process.platform==='win32'?'junction':'dir');
 const r=await createHandoff(f);assert.equal(r.manifest.files.some(x=>x.path.startsWith('linked/')),false);
});
test('rejects tampered payload and live drift',async t=>{
 const f=await fixture(t);const r=await createHandoff(f);await fs.writeFile(path.join(f.source,'a.txt'),'changed');
 assert.equal((await verifyHandoff(r.directory)).ok,true);await assert.rejects(verifyHandoff(r.directory,{live:true}),/drift|changed|verändert/i);
 await fs.writeFile(path.join(r.directory,'working/a.txt'),'tampered');await assert.rejects(verifyHandoff(r.directory),/hash|checksum/i);
});
test('rejects manifest traversal even if its checksum was replaced',async t=>{
 const f=await fixture(t);const r=await createHandoff(f);r.manifest.files[0].snapshotPath='../external.txt';
 const data=JSON.stringify(r.manifest,null,2)+'\n';await fs.writeFile(path.join(r.directory,'manifest.json'),data);await fs.writeFile(path.join(r.directory,'manifest.sha256'),hash(data));
 await assert.rejects(verifyHandoff(r.directory),/path|escape|Pfad/i);
});
test('activation and return each create a verified checkpoint and update only the local owner marker',async t=>{
 const f=await fixture(t);const a=await createHandoff({...f,owner:'gemini'});assert.equal((await ownershipStatus(f.source)).owner,'gemini');
 const b=await createHandoff({...f,owner:'codex'});assert.equal((await ownershipStatus(f.source)).owner,'codex');assert.notEqual(a.directory,b.directory);
 assert.equal((await verifyHandoff(a.directory)).ok,true);assert.equal((await verifyHandoff(b.directory)).ok,true);
});
test('refuses an unmerged index rather than losing conflict stages',async t=>{
 const f=await fixture(t);const blob=f.git('hash-object','a.txt').trim();f.git('update-index','--force-remove','a.txt');
 execFileSync('git',['-C',f.source,'update-index','--index-info'],{input:`100644 ${blob} 1\ta.txt\n100644 ${blob} 2\ta.txt\n100644 ${blob} 3\ta.txt\n`});
 await assert.rejects(createHandoff(f),/unmerged|Konflikt/i);assert.equal((await ownershipStatus(f.source)).owner,'codex');
});
test('protects the generated start context and does not export npm credentials',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.source,'.npmrc'),'//registry.example.invalid/:_authToken=fixture-private-value');
 const r=await createHandoff(f);assert.ok(r.manifest.excluded.some(x=>x.path==='.npmrc'));
 await fs.writeFile(path.join(r.directory,'CONTEXT.md'),'tampered start instructions');
 await assert.rejects(verifyHandoff(r.directory),/hash|checksum/i);
});
test('detects a changed index blob even when working bytes and porcelain status stay identical',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.source,'a.txt'),'stage-one');f.git('add','a.txt');await fs.writeFile(path.join(f.source,'a.txt'),'working');
 const r=await createHandoff(f);const before=f.git('status','--porcelain=v1','-z');
 const oid=execFileSync('git',['-C',f.source,'hash-object','-w','--stdin'],{input:'stage-two',encoding:'utf8'}).trim();f.git('update-index','--cacheinfo',`100644,${oid},a.txt`);
 assert.equal(f.git('status','--porcelain=v1','-z'),before);await assert.rejects(verifyHandoff(r.directory,{live:true}),/drift|changed|verändert/i);
});
test('detects new files inside an already untracked directory',async t=>{
 const f=await fixture(t);await fs.mkdir(path.join(f.source,'new-dir'));await fs.writeFile(path.join(f.source,'new-dir/one.txt'),'one');
 const r=await createHandoff(f);await fs.writeFile(path.join(f.source,'new-dir/two.txt'),'two');
 await assert.rejects(verifyHandoff(r.directory,{live:true}),/drift|changed|verändert/i);
});
test('preserves source with HTML autocomplete values rather than mistaking a ternary for a secret assignment',async t=>{
 const f=await fixture(t);const code="const autocomplete=changed?'new-password':'current-password';";
 await fs.writeFile(path.join(f.source,'view.ts'),code);const r=await createHandoff(f);
 assert.equal(await fs.readFile(path.join(r.directory,'working/view.ts'),'utf8'),code);
});
test('still excludes prefixed and camelCase credential identifiers',async t=>{
 const f=await fixture(t);
 for(const name of ['SERVICE_ACCESS_TOKEN','dbPassword'])await fs.writeFile(path.join(f.source,name+'.ts'),`export const ${name}="${'q'.repeat(24)}";`);
 const r=await createHandoff(f);
 for(const name of ['SERVICE_ACCESS_TOKEN','dbPassword'])assert.ok(r.manifest.excluded.some(e=>e.path===name+'.ts'&&e.reason==='sensitive content'));
});
