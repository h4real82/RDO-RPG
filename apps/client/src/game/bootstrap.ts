import { WebGLRenderer } from 'three';

export interface GameRenderer {
  readonly element: HTMLElement;
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
  return { element: renderer.domElement, dispose: () => renderer.dispose() };
}

export function bootstrapGame(root: HTMLElement, options: GameBootstrapOptions): GameSession {
  if (!root) {
    throw new Error('Game root is required');
  }

  const renderer = (options.createRenderer ?? createDefaultRenderer)();
  root.appendChild(renderer.element);
  let disposed = false;

  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      try {
        root.removeChild(renderer.element);
      } finally {
        renderer.dispose();
      }
    },
  };
}
