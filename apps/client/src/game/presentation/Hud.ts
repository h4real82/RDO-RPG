import type { PlayerPosition } from '../player/PlayerController';
import type { MinimapPoint } from './Minimap';

export class Hud {
  private readonly element: HTMLElement | undefined;

  constructor(root: HTMLElement, private readonly debug = import.meta.env.DEV) {
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
    blockedReason?: 'terrain' | 'obstacle' | 'boundary', contextLabel?:string): void {
    if (!this.element) return;
    this.element.setAttribute('data-interior',String(Boolean(contextLabel)));
    const detail = contextLabel ? `Valentine · ${contextLabel}${nearbyPoiName ? ` · ${nearbyPoiName} · F: Interagieren`: ''}` : nearbyPoiName
      ? `Valentine · ${nearbyPoiName} · F: Interagieren`
      : this.debug ? `Valentine · X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)} · Karte ${minimap?.x.toFixed(1) ?? '?'} / ${minimap?.y.toFixed(1) ?? '?'}`
        : 'Valentine · Allein unterwegs';
    const controls = ' · WASD / Linksklick: Laufen · Shift: draußen rennen · Q/E / Rechtsziehen: Drehen · F: Aktion · Esc: Menü';
    const message = (this.debug && missingModelCount > 0 ? `${detail} · Quellinventur: ${missingModelCount} offene Referenzen` : detail)
      + (blockedReason === 'terrain' ? ' · Gelände fehlt in dieser Richtung'
        : blockedReason === 'obstacle' ? ' · Gebäude im Weg'
        : blockedReason === 'boundary' ? ' · Ortsgrenze erreicht' : '') + controls;
    // Screen readers receive state changes, rather than a repeat for every stationary frame.
    if (this.debug || this.element.textContent !== message) this.element.textContent = message;
  }

  dispose(): void {
    try {
      this.element?.remove();
    } catch (error) {
      console.error('Could not dispose game HUD.', error);
    }
  }
}
