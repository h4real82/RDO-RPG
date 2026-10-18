import type { RoadRecoveryResult } from '../game/player/RoadRecovery';

export interface AppPlayableSession {
  ready: Promise<void>;
  dispose(): void;
  setPixelRatioCap?(cap: number): void;
  closeInteractionMenu?(): boolean;
  resetToRoad?():Promise<RoadRecoveryResult>;
}
export type AppSessionState='menu'|'loading'|'playing'|'paused'|'error';

/** Owns one start generation. Late readiness can never revive a canceled session. */
export class AppSessionController {
  state: AppSessionState='menu';
  error: string | undefined;
  private generation=0;
  private session: AppPlayableSession | undefined;
  recovering=false;
  recoveryResult:RoadRecoveryResult|undefined;
  private recoveryPending:Promise<RoadRecoveryResult>|undefined;
  constructor(private readonly create: ()=>AppPlayableSession, private readonly onChange: ()=>void=()=>{}) {}
  get inputCaptured(): boolean { return this.state!=='playing'; }
  get hasSession(): boolean { return Boolean(this.session); }
  private notify(): void { try { this.onChange(); } catch(error) { console.error('App state view failed.',error); } }
  async start(): Promise<void> {
    if (this.session) return;
    const token=++this.generation;
    this.state='loading';this.error=undefined;this.notify();
    try {
      this.session=this.create();
      await this.session.ready;
      if (token!==this.generation) return;
      this.state='playing';this.notify();
    } catch(error) {
      if (token!==this.generation) return;
      this.release();this.error=error instanceof Error ? error.message : String(error);
      this.state='error';this.notify();
    }
  }
  closeInteractionMenu(): boolean { return this.session?.closeInteractionMenu?.() ?? false; }
  pause(): void { if(this.state==='playing') {this.closeInteractionMenu();this.state='paused';this.notify();} }
  resume(): void { if(this.state==='paused' && !this.recovering) {this.state='playing';this.notify();} }
  resetToRoad():Promise<RoadRecoveryResult> {
    if(this.recoveryPending) return this.recoveryPending;
    const session=this.session,token=this.generation;
    if(this.state!=='paused' || !session?.resetToRoad) return Promise.resolve({status:'unavailable',message:'Rücksetzen ist nur in einer geladenen pausierten Solo-Szene verfügbar.'});
    this.recovering=true;this.recoveryResult=undefined;this.notify();
    this.recoveryPending=(async()=>{
      let result:RoadRecoveryResult;
      try {result=await session.resetToRoad!();}
      catch {result={status:'error',message:'Die Rücksetzung ist fehlgeschlagen. Du kannst sie erneut versuchen oder die Szene verlassen.'};}
      if(token!==this.generation || session!==this.session) return {status:'cancelled',message:'Die alte Sitzung wurde beendet.'} as RoadRecoveryResult;
      this.recovering=false;this.recoveryPending=undefined;this.recoveryResult=result;this.notify();return result;
    })();
    return this.recoveryPending;
  }
  private release(): void {
    const current=this.session;this.session=undefined;
    try {current?.dispose();} catch(error) {console.error('App session disposal failed.',error);}
  }
  leave(): void {++this.generation;this.release();this.recovering=false;this.recoveryPending=undefined;this.recoveryResult=undefined;this.state='menu';this.error=undefined;this.notify();}
  setPixelRatioCap(cap: number): void {this.session?.setPixelRatioCap?.(cap);}
}
