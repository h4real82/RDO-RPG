import { WebGLRenderer } from 'three';
import { startValentineRuntime } from './ValentineRuntime';
import type { ValentineRuntimeOptions } from './ValentineRuntime';
import type { RoadRecoveryActions, RoadRecoveryResult } from './player/RoadRecovery';

export interface GameRenderer {
  readonly element: HTMLElement;
  readonly nativeRenderer?: WebGLRenderer;
  dispose(): void;
}

export interface GameBootstrapOptions {
  createRenderer?: () => GameRenderer;
  onStartupError?: (error: unknown) => void;
  runtimeOptions?: Omit<ValentineRuntimeOptions,'signal'>;
  pixelRatioCap?: number;
}

export interface GameSession {
  readonly ready: Promise<void>;
  setPixelRatioCap(cap: number): void;
  closeInteractionMenu(): boolean;
  resetToRoad():Promise<RoadRecoveryResult>;
  dispose(): void;
}

function createDefaultRenderer(): GameRenderer {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  return { element: renderer.domElement, nativeRenderer: renderer, dispose: () => renderer.dispose() };
}

export function bootstrapGame(root: HTMLElement, options: GameBootstrapOptions): GameSession {
  if (!root) {
    throw new Error('Game root is required');
  }

  const renderer = (options.createRenderer ?? createDefaultRenderer)();
  root.appendChild(renderer.element);
  let disposed = false;
  let interactionMenu: {readonly isOpen: boolean;close(): void} | undefined;
  let recovery:RoadRecoveryActions|undefined, runtimeReady=false;
  const startupAbort = new AbortController();
  let stopRuntime: (() => void) | undefined;
  const dispose = (): void => {
      if (disposed) return;
      disposed = true;
      interactionMenu=undefined;
      recovery=undefined;runtimeReady=false;
      startupAbort.abort();
      try {
        stopRuntime?.();
        root.removeChild(renderer.element);
      } finally {
        renderer.dispose();
      }
  };
  const setPixelRatioCap = (cap: number): void => {
    if (disposed || !renderer.nativeRenderer) return;
    const safeCap=Number.isFinite(cap) ? Math.max(1,Math.min(2,cap)) : 2;
    const deviceRatio=typeof window==='undefined' ? 1 : window.devicePixelRatio || 1;
    renderer.nativeRenderer.setPixelRatio(Math.min(deviceRatio,safeCap));
  };
  if (options.pixelRatioCap!==undefined) setPixelRatioCap(options.pixelRatioCap);
  const ready = renderer.nativeRenderer
    ? startValentineRuntime(root,renderer.nativeRenderer,{...options.runtimeOptions,signal:startupAbort.signal,
      onInteractionMenu:(menu)=>{if(!disposed) {interactionMenu=menu;options.runtimeOptions?.onInteractionMenu?.(menu);}},
      onRoadRecovery:(actions)=>{if(!disposed) {recovery=actions;options.runtimeOptions?.onRoadRecovery?.(actions);}},
    }).then((stop)=> {
      if (disposed) {stop();throw new DOMException('Session start canceled','AbortError');}
      stopRuntime=stop;runtimeReady=true;
    }) : Promise.resolve();
  // Handle the promise even for legacy callers that do not await readiness.
  void ready.catch((error)=> {
    if (disposed) return;
    try { options.onStartupError?.(error); }
    catch (callbackError) {console.error('Startup error view failed.',callbackError);}
    finally {dispose();}
  });
  const closeInteractionMenu=(): boolean=> {
    if(disposed || !interactionMenu?.isOpen) return false;
    interactionMenu.close();return true;
  };
  const resetToRoad=():Promise<RoadRecoveryResult>=> {
    if(disposed || !runtimeReady || !recovery) return Promise.resolve({status:'unavailable',message:'Die Solo-Szene ist noch nicht bereit.'});
    return recovery.resetToRoad();
  };
  return {ready,setPixelRatioCap,closeInteractionMenu,resetToRoad,dispose};
}
