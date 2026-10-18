import './Venues.css';
export function text<K extends keyof HTMLElementTagNameMap>(tag:K,value:string,parent:HTMLElement){const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;}
export class VenueDialog {
 readonly panel=document.createElement('section');readonly content=document.createElement('div');readonly status:HTMLElement;
 private events=new AbortController();private previous=document.activeElement instanceof HTMLElement?document.activeElement:null;private closed=false;
 constructor(parent:HTMLElement,title:string,private onClose:()=>void=()=>{}){
  this.panel.className='rdo-venue';this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-modal','true');this.panel.setAttribute('aria-label',title);
  const paper=document.createElement('div');paper.className='rdo-venue__paper';this.panel.append(paper);
  text('small','VALENTINE · '+title.toUpperCase(),paper);text('h2',title,paper);paper.append(this.content);
  this.status=text('p','',paper);this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
  this.button('Zurück zum Raum',()=>this.close(),paper);parent.append(this.panel);
  window.addEventListener('keydown',event=>{try{if(!event||this.closed||!this.panel.isConnected)return;
   if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.close();}
   if(event.key==='Tab'){const all=Array.from(this.panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]'));const first=all[0],last=all.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  }catch(error){console.error('Venue keyboard failed.',error);}},{capture:true,signal:this.events.signal});
  this.panel.tabIndex=-1;this.panel.focus();
 }
 button(label:string,run:()=>void|Promise<void>,parent=this.content){const el=text('button',label,parent);el.type='button';
  el.addEventListener('click',event=>{try{if(!event||this.closed||!el.isConnected||el.disabled)return;event.preventDefault();
   void Promise.resolve(run()).catch(()=>{if(!this.closed)this.status.textContent='Aktion fehlgeschlagen. Bitte erneut versuchen.';});
  }catch{this.status.textContent='Aktion fehlgeschlagen. Bitte erneut versuchen.';}},{signal:this.events.signal});return el;}
 input(label:string,type:string,value:string){const wrapper=text('label',label,this.content),el=document.createElement('input');el.type=type;el.value=value;wrapper.append(el);return el;}
 listen(target:EventTarget,name:string,run:(event:Event)=>void){target.addEventListener(name,event=>{try{if(!event||this.closed||!this.panel.isConnected)return;run(event);}catch(error){console.error('Venue control failed.',error);}},{signal:this.events.signal});}
 get isOpen(){return !this.closed;}
 close(){if(this.closed)return;this.closed=true;this.events.abort();this.panel.remove();this.onClose();if(this.previous?.isConnected)this.previous.focus();}
}
