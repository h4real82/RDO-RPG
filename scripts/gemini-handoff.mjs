import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const toolPath=fileURLToPath(import.meta.url);
const digest=value=>createHash('sha256').update(value).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const inside=(root,target)=>{const rel=path.relative(root,target);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
const git=(root,args,encoding='utf8')=>execFileSync('git',['-C',root,...args],{encoding,stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024});
const list=value=>value.split('\0').filter(Boolean);

function safePath(root,relative){
 if(!relative||relative.includes('\\')||path.posix.isAbsolute(relative)||/^[A-Za-z]:/.test(relative)||relative.split('/').some(p=>p==='..'||p==='.'||p===''))throw new Error('Unsafe path / Pfad im Übergabepaket');
 const target=path.resolve(root,...relative.split('/'));
 if(!inside(root,target))throw new Error('Path escape');
 return target;
}
async function canonicalFuture(candidate){
 try{return await fs.realpath(candidate);}catch(error){if(error.code!=='ENOENT')throw error;const parent=path.dirname(candidate);if(parent===candidate)throw error;return path.join(await canonicalFuture(parent),path.basename(candidate));}
}
async function sourceRoot(source){return fs.realpath(git(path.resolve(source),['rev-parse','--show-toplevel']).trim());}
function state(root){return {head:git(root,['rev-parse','HEAD']).trim(),branch:git(root,['rev-parse','--abbrev-ref','HEAD']).trim(),status:git(root,['status','--porcelain=v1','--untracked-files=all','-z']).toString(),indexSha256:digest(git(root,['ls-files','--stage','-z'],null))};}
async function ownerPath(root){return path.resolve(root,git(root,['rev-parse','--git-path','codex-gemini-owner.json']).trim());}
export async function ownershipStatus(source=process.cwd()){
 const root=await sourceRoot(source),file=await ownerPath(root);
 try{const value=JSON.parse(await fs.readFile(file,'utf8'));if(!['codex','gemini'].includes(value.owner))throw new Error('Invalid owner marker');return {...value,source:root,marker:file};}
 catch(error){if(error.code==='ENOENT')return {owner:'codex',source:root,marker:file,checkpoint:null};throw error;}
}
function excludedName(name){
 return /(^|\/)(?:\.git|\.codex|\.gemini|node_modules)(?:\/|$)/i.test(name)||
 /(^|\/)(?:\.env[^/]*|\.npmrc|\.pypirc|\.netrc|mcp(?:[.-][^/]*)?\.json)$/i.test(name)||/(^|\/)(?:credentials|secrets|tokens?)(?:[.-][^/]*)?$/i.test(name)||
 /\.(?:pem|key|p12|pfx|db|sqlite|sqlite3|zip|7z|rpf)$/i.test(name)||
 /^(?:data\/(?:raw|runtime|processed)|docs\/(?:Obsidian|local-artifacts|TEMP)|apps\/client\/public\/assets)(?:\/|$)/i.test(name);
}
function sensitiveContent(bytes){
 if(bytes.includes(0))return false;
 const text=bytes.toString('utf8');
 return /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/.test(text)||/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|AIza[A-Za-z0-9_-]{30,})\b/.test(text)||
 /(?<!-)(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization)["']?\s*[:=]\s*["'](?:Bearer\s+)?[A-Za-z0-9+\/_=.-]{16,}["']/i.test(text);
}
async function existingSafe(root,relative){
 const file=safePath(root,relative),stat=await fs.lstat(file);
 if(stat.isSymbolicLink()||!stat.isFile()||!inside(root,await fs.realpath(file)))throw new Error('Symlink or path escape');
 return {file,stat};
}
async function put(root,relative,bytes){
 const file=safePath(root,relative);await fs.mkdir(path.dirname(file),{recursive:true});
 if(!inside(root,await fs.realpath(path.dirname(file))))throw new Error('Path escape');
 await fs.writeFile(file,bytes,{flag:'wx'});
}
async function writeOwner(root,value){
 const file=await ownerPath(root),temp=file+'.'+randomUUID()+'.tmp';
 await fs.writeFile(temp,json(value),{flag:'wx'});await fs.rename(temp,file);
}

export async function verifyHandoff(directory,{live=false}={}){
 const root=await fs.realpath(directory);
 const raw=await fs.readFile(path.join(root,'manifest.json'));
 if(digest(raw)!==(await fs.readFile(path.join(root,'manifest.sha256'),'utf8')).trim())throw new Error('Manifest checksum mismatch');
 const m=JSON.parse(raw);
 if(m.version!==1||m.status!=='ready'||!Array.isArray(m.files))throw new Error('Incomplete handoff');
 for(const record of [...m.files,...(m.artifacts??[])]){
  const {file}=await existingSafe(root,record.snapshotPath);
  if(digest(await fs.readFile(file))!==record.sha256)throw new Error('File hash mismatch: '+record.path);
 }
 if(live){
  const source=await sourceRoot(m.source);
  if(source!==m.source||JSON.stringify(state(source))!==JSON.stringify(m.git))throw new Error('Live drift: Git changed / verändert');
  for(const record of m.files){
   let bytes;
   if(record.kind==='working'){try{bytes=await fs.readFile((await existingSafe(source,record.path)).file);}catch{throw new Error('Live drift: file changed / verändert');}}
   else bytes=git(source,['cat-file','blob',record.objectId],null);
   if(digest(bytes)!==record.sha256)throw new Error('Live drift: file changed / verändert: '+record.path);
  }
 }
 return {ok:true,files:m.files.length,excluded:m.excluded.length,source:m.source,directory:root};
}

export async function createHandoff({source=process.cwd(),outputRoot=path.join(os.homedir(),'RDO-RPG-Handoffs'),related=[],notes='',owner,open=false,codeExecutable}={}){
 if(owner&&!['codex','gemini'].includes(owner))throw new Error('Invalid owner');
 if(sensitiveContent(Buffer.from(notes)))throw new Error('Notes contain sensitive content');
 const root=await sourceRoot(source),references=[];
 for(const item of related)references.push(await sourceRoot(item));
 const destination=await canonicalFuture(path.resolve(outputRoot));
 if([root,...references].some(r=>inside(r,destination)))throw new Error('Output must be outside / außerhalb every source checkout');
 if(git(root,['ls-files','--unmerged','-z']))throw new Error('Unmerged index / Konflikt: resolve before handoff');
 const previousOwner=await ownershipStatus(root);
 const editor=open?await editorExecutable(codeExecutable):null;
 const lockFile=path.resolve(root,git(root,['rev-parse','--git-path','codex-gemini-handoff.lock']).trim());
 const lock=await fs.open(lockFile,'wx');let directory;
 try{
  const before=state(root);
  await fs.mkdir(destination,{recursive:true});
  directory=path.join(destination,new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));
  await fs.mkdir(directory);
  const m={version:1,status:'ready',createdAt:new Date().toISOString(),source:root,git:before,related:references,previousOwner:previousOwner.owner,intendedOwner:owner??previousOwner.owner,files:[],excluded:[],deleted:list(git(root,['diff','--no-renames','--name-only','--diff-filter=D','HEAD','-z'])),localDataRoots:[]};
  m.indexEntries=list(git(root,['ls-files','--stage','-z']));
  async function capture(relative,kind,bytes,objectId){
   if(excludedName(relative)){m.excluded.push({path:relative,kind,reason:'private/config/local-data policy'});return;}
   if(bytes.length>10*1024*1024||sensitiveContent(bytes)){m.excluded.push({path:relative,kind,reason:bytes.length>10*1024*1024?'larger than10MiB':'sensitive content'});return;}
   const snapshotPath=kind+'/'+relative;await put(directory,snapshotPath,bytes);
   m.files.push({path:relative,kind,snapshotPath,sha256:digest(bytes),bytes:bytes.length,...(objectId?{objectId}:{})});
  }
  for(const relative of new Set(list(git(root,['ls-files','--cached','--others','--exclude-standard','-z'])))){
   if(excludedName(relative)){m.excluded.push({path:relative,kind:'working',reason:'private/config/local-data policy'});continue;}
   let entry;
   try{entry=await existingSafe(root,relative);}catch(error){
    if(error.code==='ENOENT'){if(!m.deleted.includes(relative))m.deleted.push(relative);continue;}
    m.excluded.push({path:relative,kind:'working',reason:'symlink/nonregular/path boundary'});continue;
   }
   if(entry.stat.size>10*1024*1024){m.excluded.push({path:relative,kind:'working',reason:'larger than10MiB'});continue;}
   await capture(relative,'working',await fs.readFile(entry.file));
  }
  const changed=new Set(list(git(root,['diff','--cached','--name-only','-z'])));
  for(const row of list(git(root,['ls-files','--stage','-z']))){
   const tab=row.indexOf('\t'),relative=row.slice(tab+1),[mode,objectId]=row.slice(0,tab).split(' ');
   if(!changed.has(relative))continue;
   if(mode!=='100644'&&mode!=='100755'){m.excluded.push({path:relative,kind:'index',reason:'nonregular Git index mode'});continue;}
   if(excludedName(relative)){m.excluded.push({path:relative,kind:'index',reason:'private/config/local-data policy'});continue;}
   if(Number(git(root,['cat-file','-s',objectId]))>10*1024*1024){m.excluded.push({path:relative,kind:'index',reason:'larger than10MiB'});continue;}
   await capture(relative,'index',git(root,['cat-file','blob',objectId],null),objectId);
  }
  for(const name of ['data/raw','data/runtime','data/processed','docs/Obsidian','docs/local-artifacts']){
   try{const p=await fs.realpath(path.join(root,name));m.localDataRoots.push({path:p,included:false,note:'Remain at original path; not backed up by this source checkpoint'});}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  const runner={type:'process',command:process.execPath,args:[toolPath],options:{cwd:root},problemMatcher:[]};
  const shared=['--source',root,'--output-root',destination,...references.flatMap(r=>['--related',r])];
  const workspace={folders:[{name:'RDO-RPG – aktiver Checkout',path:root}],extensions:{recommendations:['google.geminicodeassist','google.gemini-cli-vscode-ide-companion']},tasks:{version:'2.0.0',tasks:[
   {...runner,label:'Übergabe: An Gemini übergeben',args:[toolPath,'activate',...shared,'--notes-file',directory+'.notes.md','--open']},
   {...runner,label:'Übergabe: An Codex zurückgeben',args:[toolPath,'return',...shared,'--notes-file',directory+'.notes.md']},
   {...runner,label:'Übergabe: Snapshot und Live-Stand prüfen',args:[toolPath,'verify',directory,'--live']}
  ]}};
  await put(directory,'RDO-RPG-Gemini.code-workspace',json(workspace));
  await put(directory,'CONTEXT.md',notes||'Kein zusätzlicher Chat-Kontext übergeben. Aktuellen Linear-Stand vor Änderungen lesen.\n');
  // Mutable continuation notes live beside the immutable checkpoint, never inside it.
  await fs.writeFile(directory+'.notes.md',notes||'Neue Erkenntnisse und Prüfergebnisse für die nächste Übergabe hier ergänzen. Linear bleibt Statusquelle.\n',{flag:'wx'});
  const brief=`# Übergabe an VS Code / Gemini\n\nAktiver Checkout: ${root}\nBranch: ${before.branch}\nHEAD: ${before.head}\nErstellt: ${m.createdAt}\nZuständigkeit vor Vorbereitung: ${previousOwner.owner}; dieser Aufruf ${owner?'setzt nach erfolgreicher Prüfung '+owner:'ändert die Zuständigkeit nicht'}.\n\n## Starttext für Gemini\n\nLies AGENTS.md, GEMINI.md, docs/Linear-Workflow.md und diese Übergabe einschließlich CONTEXT.md. Arbeite ausschließlich im aktiven Checkout oben. Main/Restart nicht vermischen. Vor jeder Änderung mit node ${JSON.stringify(toolPath)} status --source ${JSON.stringify(root)} prüfen, ob owner=gemini. Wenn nicht: erst die VS-Code-Aufgabe „Übergabe: An Gemini übergeben“ vom Benutzer ausführen lassen. Danach aktuelle Gitänderungen und die passenden Linear-Issues prüfen; bestätige den übernommenen Stand und führe einen begrenzten Auftrag fort. Keine Secrets ausgeben, keine eigenen Commits des anderen Agenten zurücksetzen; nur geprüfte Dateien stagen. Jeder Codebatch endet mit npx pnpm -r build und passenden Tests. Vor Rückgabe alle neuen Erkenntnisse in der bearbeitbaren Begleitdatei ${directory}.notes.md ergänzen; CONTEXT.md im Snapshot unverändert lassen, Gemini stoppen und die Aufgabe „An Codex zurückgeben“ ausführen.\n\n## Was gesichert ist\n\n${m.files.filter(f=>f.kind==='working').length} Arbeitsdateien und ${m.files.filter(f=>f.kind==='index').length} abweichende Indexfassungen unter working/ bzw. index/, SHA256 in manifest.json. Gitstatus ist inklusive Rename-/Löschinformation enthalten. manifest.sha256 prüft die Metadatenintegrität, keine digitale Signatur. Snapshot nie als Arbeitscheckout bearbeiten.\n\n## Grenzen\n\n${m.excluded.length} Dateien/Fassungen ausgelassen: siehe excluded im Manifest. Secrets/Connector-Konfiguration und nichtignorierte Dateien über10MiB sind nicht im Paket. Ignorierte Dateien sind generell nicht Bestandteil. Lokale Rohdaten, Runtime-Assets, Vault und Galerien bleiben an den angegebenen Originalpfaden; diese Quellsicherung ist KEIN vollständiges Daten-/Maschinenbackup. Daten/Backups nicht löschen. Bestehende externe Vault-/Main-Sicherungen erhalten.\n\nVerwandte Checkouts (nur Referenz, nicht automatisch geöffnet oder mitgesichert):\n${references.map(r=>'- '+r).join('\n')||'- keine'}\n\nDie Zuständigkeitsdatei ist eine kooperative Absprache, keine Schreibsperre des Betriebssystems. Vor dem Wechsel den bisherigen Agenten stoppen. Keine automatische Chat-/Linear-Synchronisierung oder gestartete Gemini-Session wird behauptet. Google-Anleitung: https://docs.cloud.google.com/gemini/docs/codeassist/use-agentic-chat-pair-programmer\n`;
  await put(directory,'HANDOFF.md',brief);
  m.mutableNotes=directory+'.notes.md';
  m.artifacts=[];
  for(const name of ['HANDOFF.md','CONTEXT.md','RDO-RPG-Gemini.code-workspace'])m.artifacts.push({path:name,snapshotPath:name,sha256:digest(await fs.readFile(path.join(directory,name)))});
  const raw=json(m);await put(directory,'manifest.json',raw);await put(directory,'manifest.sha256',digest(raw));
  await verifyHandoff(directory,{live:true});
  if(owner)await writeOwner(root,{version:1,owner,checkpoint:directory,updatedAt:new Date().toISOString()});
  if(open){try{await launchEditor(editor,directory);}catch(error){if(owner)await writeOwner(root,{version:1,owner:previousOwner.owner,checkpoint:previousOwner.checkpoint,updatedAt:new Date().toISOString()});throw error;}}
  return {directory,manifest:m,owner:owner??previousOwner.owner};
 }catch(error){if(directory)await fs.writeFile(path.join(directory,'INCOMPLETE.txt'),'Nicht aktiviert oder nicht vollständig. Ursache prüfen; Originale wurden nicht zurückgesetzt.\n');throw error;}
 finally{await lock.close();await fs.unlink(lockFile);}
}

async function editorExecutable(explicit){
 const candidate=explicit??(process.platform==='win32'?path.join(process.env.LOCALAPPDATA??'', 'Programs/Microsoft VS Code/Code.exe'):'code');
 if(process.platform==='win32'||explicit)await fs.access(candidate);
 return candidate;
}
async function launchEditor(executable,directory){
 const child=spawn(executable,['--new-window',path.join(directory,'RDO-RPG-Gemini.code-workspace'),'--goto',path.join(directory,'HANDOFF.md')],{detached:true,stdio:'ignore',windowsHide:false});
 await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
}
async function cli(){
 const args=process.argv.slice(2),command=args.shift()??'prepare',options={related:[]};let checkpoint;
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(['--live','--open'].includes(arg)){options[arg.slice(2)]=true;continue;}
  if(['--source','--output-root','--related','--notes-file','--code-executable'].includes(arg)){
   const value=args[++i];if(!value||value.startsWith('--'))throw new Error('Missing option value');
   if(arg==='--related')options.related.push(value);else options[{'--source':'source','--output-root':'outputRoot','--notes-file':'notesFile','--code-executable':'codeExecutable'}[arg]]=value;
  }else if(command==='verify'&&!checkpoint)checkpoint=arg;else throw new Error('Unknown option: '+arg);
 }
 if(command==='status'){console.log(json(await ownershipStatus(options.source)));return;}
 if(command==='verify'){if(!checkpoint)throw new Error('verify requires checkpoint directory');console.log(json(await verifyHandoff(checkpoint,options)));return;}
 if(!['prepare','activate','return'].includes(command))throw new Error('Use prepare, activate, return, verify, or status');
 if(options.notesFile)options.notes=await fs.readFile(options.notesFile,'utf8');
 if(command==='activate')options.owner='gemini';if(command==='return')options.owner='codex';
 const result=await createHandoff(options);console.log(json({directory:result.directory,files:result.manifest.files.length,excluded:result.manifest.excluded.length,owner:result.owner}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===toolPath)cli().catch(error=>{console.error('Übergabe fehlgeschlagen: '+error.message);process.exitCode=1;});
