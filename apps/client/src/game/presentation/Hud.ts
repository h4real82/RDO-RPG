import type { PlayerPosition } from '../player/PlayerController';

export class Hud {
  private readonly element: HTMLElement | undefined;

  constructor(root: HTMLElement) {
    try {
      const element = document.createElement('aside');
      element.setAttribute('aria-live', 'polite');
      element.textContent = 'Valentine wird geladen …';
      root.appendChild(element);
      this.element = element;
    } catch (error) {
      console.error('Could not create game HUD.', error);
    }
  }

  update(position: PlayerPosition, nearbyPoiName?: string): void {
    if (!this.element) return;
    this.element.textContent = nearbyPoiName
      ? `Valentine · ${nearbyPoiName} · E: Interagieren`
      : `Valentine · X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)}`;
  }

  dispose(): void {
    try {
      this.element?.remove();
    } catch (error) {
      console.error('Could not dispose game HUD.', error);
    }
  }
}
