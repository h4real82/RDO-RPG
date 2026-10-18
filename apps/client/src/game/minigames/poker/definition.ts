import {VenueDialog,text} from '../../venues/VenueDialog';
import {PokerPractice} from './PokerRules';
import type {Venue} from '../types';
export function create(parent:HTMLElement,_variant:unknown,_venue:Venue){
 let dialog:VenueDialog|undefined,game=new PokerPractice();
 const draw=()=>{if(!dialog)return;const d=dialog;d.content.replaceChildren();
  text('p','Texas Hold’em · lokale Übung gegen einen Partner, der immer checkt oder mitgeht. 100 Testchips pro Hand, Blinds 2/4. Keine Account-Coins oder Speicherung.',d.content);
  const cards=(label:string,values:string[])=>{text('h3',label,d.content);const row=document.createElement('div');row.className='rdo-poker__cards';d.content.append(row);
   for(const card of values){const el=text('span',card==='??'?'◆':card[0]+({S:'♠',H:'♥',D:'♦',C:'♣'}[card[1]]??''),row);el.className='rdo-poker__card';el.dataset.red=String(/[HD]/.test(card[1]));el.setAttribute('aria-label',card==='??'?'Verdeckte Karte':card);}};
  cards('Deine Karten',game.player);cards(['Vor dem Flop','Flop','Turn','River','Showdown'][Math.min(game.street,4)],game.board.slice(0,game.finished?5:[0,3,4,5][game.street]));cards('Übungspartner',game.finished?game.opponent:['??','??']);
  text('p',`Du: ${game.stacks[0]} · Partner: ${game.stacks[1]} · Pot: ${game.pot} Testchips`,d.content);
  const act=(action:'fold'|'call'|'check'|'raise',amount?:number)=>{try{game.act(action,amount);draw();}catch(error){d.status.textContent=(error as Error).message;}};
  if(!game.finished){d.button('Passen',()=>act('fold'));d.button(game.toCall?`Mitgehen · ${game.toCall}`:'Check',()=>act(game.toCall?'call':'check'));
   const raise=d.input('Erhöhen auf (Testchips dieser Setzrunde)','number',String(game.bets[1]+4));raise.min=String(game.bets[1]+4);raise.max=String(game.stacks[0]+game.bets[0]);raise.step='1';d.button('Erhöhen',()=>act('raise',Number(raise.value)));d.button('All-in',()=>act('raise',game.stacks[0]+game.bets[0]));
  }else d.button('Neue Übungshand',()=>{game=new PokerPractice();draw();});
  d.status.textContent=game.result;
 };
 return {get isOpen(){return Boolean(dialog?.isOpen);},open(){dialog=new VenueDialog(parent,'Poker am grünen Tisch');draw();},dispose(){dialog?.close();dialog=undefined;}};
}
