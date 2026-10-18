import { bootstrapGame } from '../game/bootstrap';
import { AppSessionController } from './AppSessionController';
import { isDetachedTarget } from '../game/input/InputTarget';
import { loadAppSettings, normalizeAppSettings, saveAppSettings, type AppSettings } from './AppSettings';
import './AppShell.css';
import { AccountController } from './AccountController';
import { accountView, accountHeader, escapeAccount } from './AccountViews';
import './AccountViews.css';

type Screen='directory'|'modes'|'game'|'system'|'loading'|'settings'|'activities'|'manual'|'status'|'error'|string;
const activities=[
  ['Bahnhof','Ankommen und orientieren','Schaffner mit echten Sessiondaten und Empfehlungen; zweiter Infostand für Spielmechaniken.','H4R-66 / 67'],
  ['Saloons','Treffen, reden, verweilen','Anwesenheit, eigene Getränkekarte und freiwillige Musikstreams mit lokalen Lautstärken.','H4R-68–71'],
  ['Spieltische','Eine Runde unter Freunden','Poker zuerst, danach Mäxchen und Skat; private Blätter und servergeführte Regeln.','H4R-72–75'],
  ['Kinozelt','Gemeinsam zuschauen','Sitzgruppe und Host-Zeitleiste; YouTube und direkte Medien je Plattform zunächst prüfen.','H4R-76 / 77'],
  ['Stallungen','Ein Rennen durch Valentine','Zeitfahren und private Rennen erst auf einer vollständig belegten, begehbaren Route.','H4R-78 / 79'],
  ['Erinnerungsraum','Ich war hier','Ein einfaches begehbares Haus, kuratierte Objekte und dauerhafte Widmungen mit Eigentum.','H4R-80 / 81'],
];

/** Shared browser shell; unavailable online/activity states stay explicit. */
export function startAppShell(root: HTMLElement): ()=>void {
  if(!root) throw new Error('App root is required');
  let storage: Storage | undefined;
  try {storage=window.localStorage;} catch { /* In-memory settings remain usable. */ }
  const systemReducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let settings=loadAppSettings(storage,systemReducedMotion), persisted=Boolean(storage);
  let screen: Screen='directory', disposed=false, renderGeneration=0, returnFocusAction='', nextFocusAction='';
  const app=document.createElement('div');app.className='app-concept';
  app.innerHTML=`<link rel="stylesheet" href="/runtime/valentine/frontier-ui/fonts.css"><div class="app-atmosphere" aria-hidden="true"></div><div class="app-world" aria-label="Valentine Solo-Vorschau"></div>
    <div class="app-concept-tag">VALENTINE <span>· ${import.meta.env.DEV ? 'ENTWICKLUNG' : 'LOKALE ERKUNDUNG'}</span></div>
    <button type="button" class="app-system-toggle" data-action="system" hidden>Menü <kbd>Esc</kbd></button>
    <section class="app-overlay" aria-label="Valentine Menü"></section>`;
  root.append(app);
  const world=app.querySelector<HTMLElement>('.app-world');
  const overlay=app.querySelector<HTMLElement>('.app-overlay');
  const menuButton=app.querySelector<HTMLButtonElement>('.app-system-toggle');
  if(!world || !overlay || !menuButton) {app.remove();throw new Error('App surfaces unavailable');}
  const controller: AppSessionController=new AppSessionController(()=>bootstrapGame(world,{
    pixelRatioCap:settings.pixelRatioCap,runtimeOptions:{onAccountChanged:()=>{void accounts.load();},isInputCaptured:()=>controller.inputCaptured,reducedMotion:()=>settings.reducedMotion},
  }),()=> {
    screen=controller.state==='menu'?'directory':controller.state==='paused'?'system':controller.state==='playing'?'game':controller.state;
    if(controller.state==='paused' && controller.recoveryResult && !controller.recovering) nextFocusAction='recover';
    render();
  });
  const accounts=new AccountController(()=>{if(!disposed)render();});
  const accountScreens=['character','login','register','password-reset','password-update','verify'];
  let verification:{tokenHash:string;type:'email'|'recovery'}|null=null;

  const button=(action: string,label: string,primary=false): string=>`<button type="button" data-action="${action}"${primary?' class="primary"':''}>${label}</button>`;
  const back=(): string=>button('back',controller.hasSession?'Zurück zum Systemmenü':'Zurück zum Hauptmenü');
  const title=(eyebrow: string,heading: string,body: string): string=>`<div class="app-eyebrow">${eyebrow}</div><h1>${heading}</h1><p class="app-lead">${body}</p>`;
  const modeCards=(): string=>`<div class="app-mode-grid"><article data-mode="solo"><img class="app-mode-emblem" src="/runtime/valentine/frontier-ui/solo-emblem.png" alt="" width="512" height="512"><div class="app-eyebrow">01 / lokal verfügbar</div><h2>Allein erkunden</h2><p>Den vorhandenen Teil von Valentine entdecken. Die Welt befindet sich noch im Aufbau.</p>${button('start','Solo-Vorschau starten',true)}</article><article data-mode="private" class="planned"><img class="app-mode-emblem" src="/runtime/valentine/frontier-ui/posse-emblem.png" alt="" width="512" height="512"><div class="app-eyebrow">02 / geplant</div><h2>Private Session</h2><p>Mit Freunden treffen und gemeinsam spielen. Der Online-Einstieg wird später geöffnet.</p><button type="button" disabled>Noch nicht verfügbar</button></article><article data-mode="discord" class="planned"><img class="app-mode-emblem" src="/runtime/valentine/frontier-ui/discord-emblem.png" alt="" width="512" height="512"><div class="app-eyebrow">03 / geplant</div><h2>Discord-Session</h2><p>Mit deiner Gruppe aus Discord starten. Nutzt künftig dieselbe private Session.</p><button type="button" disabled>Verbindung folgt</button></article></div>`;
  const ledgerFrame=(content:string):string=>`<div class="app-ledger"><header class="app-ledger-header"><img class="app-portrait" src="/runtime/valentine/frontier-ui/outlaw-portrait.png" alt="" width="512" height="512"><div><div class="app-eyebrow">The Valentine Chronicles</div><h1 class="app-wordmark">RDO <em>RPG</em></h1><p class="app-brand-subtitle">Troublemakers OUTLAW Web-Based Experience</p></div><div class="app-ledger-connection">${accountHeader(accounts)}</div></header><div class="app-ledger-body"><nav class="app-ledger-nav" aria-label="Hauptmenü"><div class="app-eyebrow">Hauptmenü</div>${button('modes','Spielen <span>→</span>',screen==='directory'||screen==='modes')}${button('character','Charakter <span>→</span>',screen==='character')}${button('activities','Valentine & Aktivitäten <span>→</span>')}${button('settings','Einstellungen <span>→</span>')}${button('manual','Anleitung <span>→</span>')}${button('status','Projektstand <span>→</span>')}<p class="app-directory-note">Staub an den Stiefeln.<br>Freunde im Saloon.<br>Dein Weg nach Valentine.</p></nav><section class="app-ledger-main" aria-label="${accountScreens.includes(screen)?'Spielerprofil und Anmeldung':'Spielmodus wählen'}">${content}</section></div></div>`;
  const frontierLedger=():string=>ledgerFrame(`<div class="app-eyebrow">Spielsitzung wählen</div><h2 class="app-ledger-title">Wähle deinen Pfad</h2>${modeCards()}<div class="app-deployment-note"><span class="app-eyebrow">Dein Einstieg</span><p>Valentine erkunden · Welt im Aufbau</p><span>Die lokale Vorschau speichert keinen Fortschritt. Dein Profil findest du unter Charakter.</span></div>`);
  const applySettings=(): void=> {
    app.style.setProperty('--app-scale',String(settings.uiScale/100));
    app.dataset.reducedMotion=String(settings.reducedMotion);
    controller.setPixelRatioCap(settings.pixelRatioCap);
  };
  const persist=(): void=> {
    persisted=saveAppSettings(storage,settings);
    const status=overlay.querySelector<HTMLElement>('[data-save-state]');
    if(status) status.textContent=persisted?'Auf diesem Gerät gespeichert.':'Nur für diese Sitzung: Browser-Speicher nicht verfügbar.';
  };
  function render(): void {
    if(disposed || !overlay || !world || !menuButton) return;
    const generation=++renderGeneration;
    app.dataset.screen=screen;app.dataset.sessionState=controller.state;
    const playing=screen==='game';
    overlay.hidden=playing;menuButton.hidden=!playing;world.hidden=!controller.hasSession;
    overlay.setAttribute('role',controller.hasSession?'dialog':'region');
    overlay.setAttribute('aria-modal',controller.hasSession?'true':'false');
    if(playing) {overlay.innerHTML='';}
    else {
      let content='';
      switch(screen) {
        case 'character': case 'login': case 'register': case 'password-reset': case 'password-update': case 'verify': content=ledgerFrame(accountView(screen,accounts));break;
        case 'directory': content=frontierLedger();break;
        case 'modes': content=frontierLedger();break;
        case 'loading': content=`${title('Lokale Solo-Vorschau','Valentine wird geladen','Original-Manifest, Modelle und echter Startboden werden geprüft. Kein erfundener Prozentbalken.')}<div class="app-loading" role="status">Quellszene wird vorbereitet …</div>${button('leave','Laden abbrechen')}`;break;
        case 'system': content=`${title('Du bist in Valentine','Systemmenü','Die lokale Bewegung und Kamerasteuerung ruhen, solange dieses Menü geöffnet ist.')}<nav class="app-system-nav" aria-label="Systemmenü">${controller.recovering?'<button type="button" disabled>Fortsetzen</button>':button('resume','Fortsetzen',true)}${controller.recovering?'<button type="button" disabled>Straßenpunkt wird geprüft …</button>':button('recover','Zur Straße zurücksetzen')}${button('activities','Aktivitäten ansehen')}${button('settings','Einstellungen')}${button('manual','Anleitung')}${button('status','Quellen- und Projektstand')}${button('leave','Solo-Vorschau beenden')}</nav><p data-recovery-status role="status"></p>`;break;
        case 'settings': content=`${title('Dein Gerät, deine Ansicht','Einstellungen','Passe Lesbarkeit, Menübewegung und Render-Auflösung für dieses Gerät an.')}<div class="app-settings"><label for="app-text-scale">Textgröße <output id="app-scale-value">${settings.uiScale}%</output></label><input id="app-text-scale" data-setting="uiScale" type="range" min="100" max="150" step="25" value="${settings.uiScale}"><label for="app-pixel-ratio">Render-Auflösung: maximaler Gerätefaktor</label><select id="app-pixel-ratio" data-setting="pixelRatioCap">${[1,1.5,2].map(v=>`<option value="${v}"${settings.pixelRatioCap===v?' selected':''}>${v}×${v===2?' · Standard':''}</option>`).join('')}</select><p class="app-note">Begrenzt den tatsächlichen Canvas-Backbuffer auf die Geräteauflösung. Sichtbar bei Geräten mit höherem Pixelfaktor.</p><label class="app-check"><input data-setting="reducedMotion" type="checkbox"${settings.reducedMotion?' checked':''}>Kamera- und Menüanimationen reduzieren</label><p class="app-note">Audio, Voice, Schatten und FOV sind hier nicht als Scheinregler aktiv. Die aktuelle Kamera ist orthografisch.</p><p data-save-state role="status">${persisted?'Auf diesem Gerät gespeichert.':'Nur für diese Sitzung: Browser-Speicher nicht verfügbar.'}</p>${button('reset-settings','Einstellungen zurücksetzen')}${back()}</div>`;break;
        case 'activities': content=`${title('Valentine als Treffpunkt','Orte und Möglichkeiten','Geplanter Ausbau. Diese Karten starten noch keine Multiplayer-Runden oder Medienwiedergabe.')}<div class="app-activity-grid"><article><div class="app-eyebrow">Smithfield’s Saloon · lokal verfügbar</div><h2>Darts am Feierabend</h2><p>Sechs Übungswürfe mit Maus oder Pfeiltasten. In der Solo-Welt vor oder im Saloon F drücken oder die Darts-Markierung anklicken. Keine Einsätze.</p><small>Lokales Spiel · eigene Regeln</small></article>${activities.map(([name,heading,description,issue])=>`<article><div class="app-eyebrow">${name} · geplant</div><h2>${heading}</h2><p>${description}</p><small>${issue}</small></article>`).join('')}</div>${back()}`;break;
        case 'manual': content=`${title('Der erste Besuch','Anleitung','Die vorhandene Solo-Szene lässt sich bereits erkunden. Fehlendes Gelände wird nicht durch unsichtbaren Ersatzboden ergänzt.')}<dl class="app-manual"><dt>W A S D</dt><dd>Bewegen relativ zur Kamera; W läuft zum oberen Bildrand.</dd><dt>Mausrad / + / −</dt><dd>Kamerazoom; 0 setzt Zoom und Drehrichtung zurück.</dd><dt>Q / E · Rechtsziehen</dt><dd>Kamera um den Charakter drehen.</dd><dt>Linksklick / Rechtsklick</dt><dd>Direkt zu einem erreichbaren Bodenpunkt laufen / verfügbare Aktionen öffnen. Hindernisse mit Zwischenzielen umgehen.</dd><dt>F</dt><dd>Interaktion am nahen Ort. Im Innenraum nahe der Dartscheibe in Smithfield’s Saloon startet die lokale Darts-Übung; andere Kategorien erklären ihren Status.</dd><dt>Escape / Menü</dt><dd>Systemmenü öffnen, Unterseite schließen oder fortsetzen.</dd><dt>Tab / Enter</dt><dd>Menü mit sichtbarem Fokus bedienen.</dd></dl><p class="app-note">Das responsive Menü ist mobil nutzbar. Eine vollständige Touch-Weltsteuerung ist noch nicht implementiert.</p>${back()}`;break;
        case 'status': content=`${title('Quellen vor Versprechen','Projektstand','Ein grüner Build ersetzt weder die vollständige Map-Abnahme noch eine echte Zwei-Client-Session.')}<ul class="app-status-list"><li>Echte lokale Quellszene mit registrierter Spielgrenze.</li><li>Vollständiges Terrain, Materialien und Gesamtroute noch offen.</li><li>Saloon-Darts ist als lokale Übung verfügbar. Private Sessions und weitere Aktivitäten folgen.</li><li>Ein vereinfachter Bank-Innenraum dient als erster begehbarer Pilot. Weitere Häuser folgen; der große Wald bleibt Kulisse.</li></ul><p class="app-note">Keine Demo-Spielerzahl, kein vorgetäuschter Ping und keine erfundene Tickrate.</p>${back()}`;break;
        case 'error': content=`${title('Der Einstieg ist fehlgeschlagen','Valentine konnte nicht starten','Du kannst den Start wiederholen oder zum Hauptmenü zurückkehren.')}<p data-error-detail role="alert"></p>${button('start','Erneut versuchen',true)}${button('leave','Zum Hauptmenü')}`;break;
        default: content=`${title('Diese Seite ist unbekannt','Ansicht nicht verfügbar','Der Entwurf kann hier sicher geschlossen werden.')} ${back()}`;
      }
      overlay.innerHTML=`<div class="app-page">${!['directory','modes',...accountScreens].includes(screen)?'<div class="app-small-brand">RDO RPG <span>◆</span> Valentine</div>':''}${content}<footer><span>VALENTINE · NEW HANOVER</span><span>Lokale Erkundung · Welt im Aufbau</span></footer></div>`;
      const recoveryStatus=overlay.querySelector<HTMLElement>('[data-recovery-status]');
      if(recoveryStatus) recoveryStatus.textContent=controller.recovering?'Straßenpunkt und freier Weg werden geprüft …':controller.recoveryResult?.message ?? 'Wenn du festhängst, kannst du zu einem geprüften Straßenpunkt zurückkehren.';
      const errorDetail=overlay.querySelector<HTMLElement>('[data-error-detail]');
      if(errorDetail) errorDetail.textContent=controller.error ?? 'Unbekannter Startfehler';
    }
    requestAnimationFrame(()=> {
      if(disposed || generation!==renderGeneration || !app.isConnected) return;
      if(playing) {const canvas=world.querySelector('canvas');if(canvas){canvas.tabIndex=0;canvas.focus();}}
      else {
        const preferred=nextFocusAction?overlay.querySelector<HTMLElement>(`[data-action="${nextFocusAction}"]`):null;
        (preferred ?? overlay.querySelector<HTMLElement>('button:not(:disabled),input,select'))?.focus();
        nextFocusAction='';
      }
    });
  }
  const open=(next: Screen): void=> {
    if(controller.state==='playing') controller.pause();
    screen=next;render();
  };
  const goBack=(): void=> {nextFocusAction=returnFocusAction;screen=controller.hasSession?'system':'directory';render();};
  const cleanup: (()=>void)[]=[];
  const listen=(node: EventTarget | null,type: string,callback: (event: Event)=>void,options?: AddEventListenerOptions | boolean): void=> {
    if(!node) return;
    const guarded=(event: Event): void=> {try {if(!disposed && app.isConnected && !event.defaultPrevented && !isDetachedTarget(event)) callback(event);}catch(error){console.error(`App ${type} failed.`,error);}};
    node.addEventListener(type,guarded,options);cleanup.push(()=>node.removeEventListener(type,guarded,options));
  };
  listen(app,'click',(event)=> {
    if(!(event.target instanceof Element)) return;
    const target=event.target.closest<HTMLButtonElement>('button[data-action]');
    if(!target || target.disabled || !app.contains(target)) return;
    const action=target.dataset.action;
    if(accountScreens.includes(action??'')){if(['verification-required','reset-requested'].includes(accounts.state))accounts.state='signed-out';returnFocusAction=action??'';open(action!);}
    else if(action==='account-retry')void accounts.load();
    else if(action==='account-discord')void accountAction('/discord/link/start',{},true);
    else if(action==='account-logout'||action==='account-logout-all'){controller.leave();void accountAction(action==='account-logout'?'/auth/logout':'/auth/logout-all',{});}
    else if(action==='account-verify'&&verification)void confirmVerification();
    else if(action==='account-history')void showHistory();
    else if(['settings','activities','manual','status'].includes(action??'')) {returnFocusAction=action??'';open(action!);}
    else if(action==='modes') {nextFocusAction='start';open('modes');}
    else if(action==='start') void controller.start();
    else if(action==='system') controller.pause();
    else if(action==='recover') void controller.resetToRoad();
    else if(action==='resume') controller.resume();
    else if(action==='leave') controller.leave();
    else if(action==='back') goBack();
    else if(action==='reset-settings') {settings=normalizeAppSettings(null,systemReducedMotion);persist();applySettings();render();}
  });
  async function accountAction(path:string,body:unknown,navigate=false,method='POST'):Promise<void>{
    try{
      const data=await accounts.action(path,body,method);if(disposed||!data)return;
      if(navigate){const url=new URL(data.url,location.origin);if(url.protocol!=='https:')throw new Error('Invalid provider URL');location.assign(url.href);return;}
      if(data.state==='password-update'){open('password-update');return;}
      if(data.profile){await accounts.load();if(!disposed)open('character');}
      else if(data.state==='signed-out')open('login');else render();
    }catch{if(!disposed)accounts.feedback('accounts_unavailable');}
  }
  async function confirmVerification():Promise<void>{
    if(!verification||accounts.busy)return;
    try{
      const data=await accounts.action('/auth/verify',verification);if(!data||disposed)return;
      verification=null;
      if(data.state==='password-update')open('password-update');
      else if(data.profile){await accounts.load();if(!disposed)open('character');}
    }catch{if(!disposed)accounts.feedback('accounts_unavailable');}
  }
  async function showHistory():Promise<void>{
    const ownerId=accounts.profile?.id;if(!ownerId)return;
    try{
      const r=await fetch('/api/me/wallet/entries',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('History unavailable');
      const data=await r.json();if(disposed||screen!=='character'||accounts.profile?.id!==ownerId)return;
      const list=overlay?.querySelector<HTMLElement>('[data-account-history]');
      if(list)list.innerHTML=`<ul class="app-wallet-history">${data.entries.map((v:any)=>`<li>${escapeAccount(v.reason)} <strong>${escapeAccount(v.amount)} Coins</strong></li>`).join('')}</ul>`;
    }catch{if(!disposed)accounts.feedback('accounts_unavailable');}
  }
  listen(app,'submit',event=>{
    if(!(event.target instanceof HTMLFormElement)||!event.target.dataset.accountForm)return;
    event.preventDefault();if(accounts.busy)return;
    const form=event.target,data=new FormData(form),mode=form.dataset.accountForm;
    const values:Record<string,FormDataEntryValue>={};data.forEach((value,name)=>{values[name]=value;});
    if((mode==='register'||mode==='password-update')&&values.password!==values.confirmPassword){accounts.feedback('password_mismatch');return;}
    if(mode==='profile')void accountAction('/me',{displayName:values.displayName},false,'PATCH');
    else if(mode==='unlink')void accountAction('/discord/unlink',{password:values.password});
    else if(['login','register','password-reset','password-update'].includes(mode??''))void accountAction('/auth/'+mode,{...values,remember:data.get('remember')==='on'});
  });
  listen(app,'contextmenu',event=>{if(event)event.preventDefault();},{capture:true});
  listen(app,'change',(event)=> {
    const target=event.target;
    if(!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const key=target.dataset.setting;
    if(key==='uiScale') settings=normalizeAppSettings({...settings,uiScale:Number(target.value)});
    else if(key==='pixelRatioCap') settings=normalizeAppSettings({...settings,pixelRatioCap:Number(target.value)});
    else if(key==='reducedMotion' && target instanceof HTMLInputElement) settings={...settings,reducedMotion:target.checked};
    else return;
    applySettings();persist();const output=app.querySelector<HTMLOutputElement>('#app-scale-value');if(output)output.value=`${settings.uiScale}%`;
  });
  listen(app,'error',(event)=> {
    if(event.target instanceof HTMLImageElement) event.target.hidden=true;
  },true);
  listen(window,'keydown',(event)=> {
    const key=event as KeyboardEvent;
    if(key.isComposing || key.ctrlKey || key.metaKey || key.altKey || key.key==='Process') return;
    if(key.key==='Escape' && !key.repeat) {
      key.preventDefault();
      if(controller.state==='loading') controller.leave();
      else if(screen==='game') {if(!controller.closeInteractionMenu()) controller.pause();}
      else if(screen==='system') controller.resume();
      else if(screen!=='directory') goBack();
    }
    if(key.key==='Tab' && controller.hasSession && screen!=='game') {
      const focusable=Array.from(overlay.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href]')).filter(n=>n.getClientRects().length);
      if(!focusable.length) return;
      const first=focusable[0],last=focusable[focusable.length-1],active=document.activeElement;
      if(key.shiftKey && (active===first || !overlay.contains(active))) {key.preventDefault();last.focus();}
      else if(!key.shiftKey && (active===last || !overlay.contains(active))) {key.preventDefault();first.focus();}
    }
  });
  const api={getState:()=>({screen,sessionState:controller.state,inputCaptured:controller.inputCaptured,settings:{...settings},persisted,recovering:controller.recovering}),showScreen:open};
  if(import.meta.env.DEV) window.__rdoAppConcept=api;
  try{
    const query=new URLSearchParams(location.search),view=query.get('account');
    if(view==='profile'||view==='login')screen=view==='profile'?'character':'login';
    const tokenHash=query.get('token_hash'),type=query.get('type');
    if(tokenHash&&(type==='email'||type==='recovery')){verification={tokenHash,type};screen='verify';}
    if(query.get('auth_error')){accounts.error='auth_cancelled';screen='login';}
    if(view||tokenHash){for(const name of ['account','token_hash','type','auth_error'])query.delete(name);history.replaceState(null,'',location.pathname+(query.size?'?'+query:'')+location.hash);}
  }catch{/* A blocked History API does not prevent opening the menu. */}
  applySettings();render();void accounts.load();
  return ()=> {
    if(disposed) return;
    disposed=true;accounts.dispose();verification=null;cleanup.forEach(stop=>stop());controller.leave();app.remove();
    if(window.__rdoAppConcept===api) delete window.__rdoAppConcept;
  };
}

export {startAppShell as startAppConcept};

declare global {interface Window {__rdoAppConcept?: {getState(): {screen:string;sessionState:string;inputCaptured:boolean;settings:AppSettings;persisted:boolean;recovering:boolean};showScreen(screen:string):void};}}
