import{VenueDialog,text}from'../../venues/VenueDialog';import type{Venue}from'../types';
import{SchnautzGame,chooseSchnautzMove,parseSchnautzConfig,cardLabel,type SchnautzMove}from'./SchnautzGame';
import{evaluateHand,type Card}from'./SchwimmenRules';import{CardSound}from'./CardSound';import'./Schnautz.css';
const symbols={H:'♥',D:'♦',C:'♣',S:'♠'};
export function create(parent:HTMLElement,variant:unknown,_venue:Venue){
 const config=parseSchnautzConfig(variant),game=new SchnautzGame(config),sound=new CardSound();
 let dialog:VenueDialog|undefined,timer:ReturnType<typeof setTimeout>|undefined,disposed=false,paused=false,handChoice:number|undefined,marketChoice:number|undefined;
 const cancelTimer=()=>{if(timer!==undefined)clearTimeout(timer);timer=undefined;};
 const stop=()=>{if(disposed)return;disposed=true;cancelTimer();sound.dispose();};
 const button=(parent:HTMLElement,label:string,action:string,disabled=false)=>{const b=text('button',label,parent);b.type='button';b.dataset.action=action;b.dataset.revision=String(game.revision);b.disabled=disabled;return b;};
 const face=(parent:HTMLElement,c:Card,action?:string,index?:number,selected=false)=>{
  const card=action?button(parent,'',action,paused||game.phase!=='playing'||game.current.id!=='you'):text('div','',parent);card.className='rdo-schnautz__card';card.dataset.red=String(c.suit==='H'||c.suit==='D');card.setAttribute('aria-label',cardLabel(c));
  if(index!==undefined){card.dataset.index=String(index);card.dataset.focusKey=`${action}-${index}`;}if(action)card.setAttribute('aria-pressed',String(selected));
  text('span',c.rank,card).className='rdo-schnautz__rank';text('span',symbols[c.suit],card).className='rdo-schnautz__suit';text('span',`${c.rank}${symbols[c.suit]}`,card).className='rdo-schnautz__corner';return card;
 };
 const render=()=>{
  const d=dialog;if(!d?.isOpen||disposed)return;cancelTimer();
  const focused=document.activeElement instanceof HTMLElement?document.activeElement.dataset.focusKey:undefined,rulesOpen=d.content.querySelector('details')?.open??false;
  d.content.replaceChildren();d.panel.dataset.schnautzState=JSON.stringify({phase:game.phase,round:game.round,revision:game.revision,current:game.current?.id,paused,hand:game.players[0]?.hand.map(c=>c.suit+c.rank),market:game.market.map(c=>c.suit+c.rank),lives:game.players.map(p=>p.lives),finalTurns:game.finalTurns});
  const table=text('div','',d.content);table.className='rdo-schnautz__table';
  if(game.phase==='ready'){
   const intro=text('div','',table);intro.className='rdo-schnautz__intro';text('small','KEANE’S SALOON · DER TISCH IST FREI',intro);text('h3','Drei Marken. Eine letzte Runde.',intro);text('p','Doc Morgan wartet geduldig auf eine gute Hand. Rose Callahan klopft früher. Welche Karte lässt du liegen?',intro);
   const sample=text('div','',intro);sample.className='rdo-schnautz__cards';for(const c of [{suit:'H',rank:'A'},{suit:'H',rank:'K'},{suit:'H',rank:'10'}] as Card[])face(sample,c);
   button(intro,'Platz nehmen & Karten geben','start');
  }else{
   const guests=text('div','',table);guests.className='rdo-schnautz__guests';guests.hidden=game.phase!=='playing';
   for(const p of game.players.slice(1)){
    const seat=text('div','',guests);seat.className='rdo-schnautz__guest';seat.dataset.active=String(game.phase==='playing'&&game.current.id===p.id);text('strong',p.name,seat);text('small',p.id==='doc'?'Bedächtiger Spieler':'Mutige Klopferin',seat);
    const backs=text('div','',seat);backs.className='rdo-schnautz__backs';for(let i=0;i<p.hand.length;i++)text('span','✦',backs).setAttribute('aria-label','Verdeckte Karte');text('div',`${'●'.repeat(p.lives)}${'○'.repeat(config.startingLives-p.lives)} · ${p.lives?'Holzmarken':'Ausgeschieden'}`,seat).className='rdo-schnautz__marks';
   }
   const headline=text('div',paused?'PAUSE':game.phase==='playing'?game.current.id==='you'?'DEIN ZUG':`${game.current.name.toUpperCase()} ÜBERLEGT …`:game.phase==='match-over'?'PARTIE BEENDET':'KARTEN AUF DEN TISCH',table);headline.className='rdo-schnautz__turn';
   if(game.knocker&&game.phase==='playing')text('p',`Es wurde geklopft · noch ${game.finalTurns} letzter ${game.finalTurns===1?'Zug':'Züge'}`,table).className='rdo-schnautz__last-call';
   if(game.phase==='playing'){
   const center=text('div','',table);center.className='rdo-schnautz__market';text('small','TISCHMITTE · WÄHLE EINE KARTE ZUM TAUSCH',center);const row=text('div','',center);row.className='rdo-schnautz__cards';game.market.forEach((c,i)=>face(row,c,'market',i,marketChoice===i));
   const hand=text('div','',table);hand.className='rdo-schnautz__hand';const you=game.players[0];text('strong',`Deine Hand · ${evaluateHand(you.hand).toLocaleString('de-DE')} Punkte`,hand);const handRow=text('div','',hand);handRow.className='rdo-schnautz__cards';you.hand.forEach((c,i)=>face(handRow,c,'hand',i,handChoice===i));text('div',`${'●'.repeat(you.lives)}${'○'.repeat(config.startingLives-you.lives)} · ${you.lives} Holzmarken`,hand).className='rdo-schnautz__marks';
    const controls=text('div','',table);controls.className='rdo-schnautz__actions';const inactive=paused||game.current.id!=='you';button(controls,'Ausgewählte Karten tauschen','swap',inactive||handChoice===undefined||marketChoice===undefined);button(controls,'Alle drei tauschen','swap-all',inactive);button(controls,'Schieben','pass',inactive);button(controls,'Klopfen · letzte Runde','knock',inactive||game.knocker!==undefined);
   }
   if(game.summary){const summary=text('div','',table);summary.className='rdo-schnautz__summary';text('h3',game.summary.reason,summary);
    for(const row of game.summary.rows){const line=text('div','',summary);line.dataset.lost=String(row.lost);text('strong',row.name,line);const cards=text('div','',line);cards.className='rdo-schnautz__cards';row.hand.forEach(c=>face(cards,c));text('span',`${row.points.toLocaleString('de-DE')} Punkte · ${row.lost?'−1 Marke':'sicher'}`,line);}
    text('p',game.message,summary);if(game.phase==='round-over')button(summary,'Nächste Runde geben','next');else button(summary,'Neue Partie am Tisch','start');
   }
  }
  const footer=text('div','',d.content);footer.className='rdo-schnautz__footer';if(game.phase==='playing')button(footer,paused?'Weiterspielen':'Pause','pause');if(game.phase!=='ready')button(footer,'Neue Partie','start');button(footer,sound.muted?'Ton an':'Ton aus','sound');button(footer,'Zum Schankraum','leave');text('small','LOKALES ÜBUNGSSPIEL · HOLZMARKEN, KEINE COINS',footer);
  const rules=text('details','',d.content);rules.open=rulesOpen;text('summary','Hausregeln & Wertung',rules);text('p',config.rulesText??'',rules);
  d.status.textContent=game.message;d.status.dataset.paused=String(paused);
  if(focused)d.content.querySelector<HTMLElement>(`[data-focus-key="${focused}"]`)?.focus();
  if(game.phase==='playing'&&game.current.id!=='you'&&!paused){const revision=game.revision,actor=game.current.id;timer=setTimeout(()=>{try{timer=undefined;if(disposed||!dialog?.isOpen||paused||game.revision!==revision)return;const guest=game.current,move=chooseSchnautzMove(guest.hand,game.market,{mayKnock:game.knocker===undefined,turnNumber:game.turnNumber,knockAt:guest.knockAt});game.act(actor,move,revision);sound.play(move.type==='knock');render();}catch(error){if(dialog?.isOpen){paused=true;dialog.status.textContent='Der Tisch ist angehalten. Du kannst eine neue Partie beginnen.';}console.error('Schnautz guest turn failed.',error);}},750);}
 };
 return{get isOpen(){return Boolean(dialog?.isOpen);},open(){
  dialog=new VenueDialog(parent,'Schnautz31 · Keane’s Saloon',stop);const d=dialog;d.panel.classList.add('rdo-schnautz');
  d.listen(d.content,'click',event=>{
   if(!event||!(event.target instanceof Element)||disposed)return;const b=event.target.closest<HTMLButtonElement>('button[data-action]');if(!b||!d.content.contains(b)||b.disabled)return;event.preventDefault();const action=b.dataset.action;
   if(action==='leave'){d.close();return;}
   if(action==='start'){cancelTimer();sound.enable();paused=false;handChoice=marketChoice=undefined;game.start();sound.play();render();return;}
   if(action==='sound'){sound.toggle();render();return;}if(action==='pause'){paused=!paused;render();return;}if(action==='next'){handChoice=marketChoice=undefined;game.nextRound();sound.play();render();return;}
   if(paused||game.phase!=='playing'||game.current.id!=='you')return;
   if(action==='hand'){handChoice=Number(b.dataset.index);render();return;}if(action==='market'){marketChoice=Number(b.dataset.index);render();return;}
   let move:SchnautzMove;if(action==='swap'){if(handChoice===undefined||marketChoice===undefined)return;move={type:'swap',hand:handChoice,market:marketChoice};}else if(action==='swap-all'||action==='pass'||action==='knock')move={type:action};else return;
   const result=game.act('you',move,Number(b.dataset.revision));if(!result.ok){d.status.textContent=result.reason??'Dieser Zug ist nicht verfügbar.';return;}handChoice=marketChoice=undefined;sound.play(action==='knock');render();
  });
  d.listen(document,'visibilitychange',()=>{if(document.hidden&&game.phase==='playing'){paused=true;render();}});render();
 },dispose(){dialog?.close();stop();dialog=undefined;}};
}
