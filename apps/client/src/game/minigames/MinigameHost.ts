import type {GameResolver,LocalGame,Venue} from './types';
/** Local lifecycle only. Online authority/join/reconnect is a separate adapter. */
export class MinigameHost {
  private phase:'idle'|'loading'|'active'|'leaving'|'error'='idle';
  private generation=0;private disposed=false;private game?:LocalGame;
  constructor(private readonly parent:HTMLElement,private readonly registry:GameResolver,private readonly onError:(message:string)=>void){}
  get state(){if(this.phase==='active' && !this.game?.isOpen)this.phase='idle';return this.phase;}
  get isOpen():boolean{return this.state==='loading' || this.state==='active';}
  async open(gameId:string,variantId:string,venue:Venue):Promise<void>{
    if(this.disposed || !this.parent?.isConnected || this.isOpen)return;
    this.close();const generation=++this.generation;this.phase='loading';
    try {
      const resolved=this.registry.resolve(gameId,variantId),module=await resolved.load();
      if(this.disposed || generation!==this.generation || !this.parent.isConnected)return;
      this.game=module.create(this.parent,resolved.variant,venue);this.game.open();
      if(!this.game.isOpen)throw new Error('Das Spiel konnte nicht geöffnet werden.');
      this.phase='active';
    } catch(error){
      if(this.disposed || generation!==this.generation)return;
      this.game?.dispose();this.game=undefined;this.phase='error';
      this.onError(error instanceof Error?error.message:'Das Spiel ist derzeit nicht verfügbar.');
    }
  }
  close():void{++this.generation;this.phase='leaving';try{this.game?.dispose();}finally{this.game=undefined;this.phase='idle';}}
  dispose():void{this.disposed=true;this.close();}
}
