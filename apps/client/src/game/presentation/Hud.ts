import type { PlayerPosition } from '../player/PlayerController';
import type { MinimapPoint } from './Minimap';

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

  update(position: PlayerPosition, nearbyPoiName?: string, minimap?: MinimapPoint, missingModelCount = 0,
    blockedReason?: 'terrain' | 'obstacle'): void {
    if (!this.element) return;
    const detail = nearbyPoiName
      ? `Valentine · ${nearbyPoiName} · E: Interagieren`
      : `Valentine · X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)} · Karte ${minimap?.x.toFixed(1) ?? '?'} / ${minimap?.y.toFixed(1) ?? '?'}`;
    const controls = ' · Zoom: Mausrad / + / − · 0: Zurücksetzen';
    this.element.textContent = (missingModelCount > 0 ? `${detail} · Teilvorschau: ${missingModelCount} Modelle fehlen` : detail)
      + (blockedReason === 'terrain' ? ' · Gelände fehlt in dieser Richtung'
        : blockedReason === 'obstacle' ? ' · Gebäude im Weg' : '') + controls;
  }

  dispose(): void {
    try {
      this.element?.remove();
    } catch (error) {
      console.error('Could not dispose game HUD.', error);
    }
  }
}
