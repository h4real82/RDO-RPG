import { WebGLRenderer } from 'three';
import { startValentineRuntime } from './ValentineRuntime';

export interface GameRenderer {
  readonly element: HTMLElement;
  readonly nativeRenderer?: WebGLRenderer;
  dispose(): void;
}

export interface GameBootstrapOptions {
  createRenderer?: () => GameRenderer;
}

export interface GameSession {
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
  let stopRuntime: (() => void) | undefined;
  if (renderer.nativeRenderer) {
    void startValentineRuntime(root, renderer.nativeRenderer).then((stop) => {
      if (disposed) stop();
      else stopRuntime = stop;
    }).catch((error) => console.error('Could not start Valentine runtime.', error));
  }

  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      try {
        stopRuntime?.();
        root.removeChild(renderer.element);
      } finally {
        renderer.dispose();
      }
    },
  };
}
