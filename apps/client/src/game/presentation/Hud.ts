import type { PlayerPosition } from '../player/PlayerController';
import type { MinimapPoint } from './Minimap';
import { WalletService, formatCoins } from '../economy/WalletService';

export class Hud {
  private readonly element: HTMLElement | undefined;
  private readonly walletElement: HTMLElement | undefined;
  private readonly unsubscribeWallet?: () => void;
  private currentBalance = 5000n;

  constructor(root: HTMLElement, private readonly debug = import.meta.env.DEV) {
    try {
      const element = document.createElement('aside');
      element.setAttribute('aria-live', 'polite');
      element.textContent = 'Valentine wird geladen …';
      root.appendChild(element);
      this.element = element;

      if (typeof document.createElement === 'function') {
        const wallet = document.createElement('div');
        if (typeof wallet.setAttribute === 'function') {
          wallet.setAttribute('aria-label', 'Geldbörse');
          wallet.setAttribute('class', 'rdo-hud-wallet');
          if ('style' in wallet && typeof wallet.style === 'object') {
            wallet.style.cssText =
              'position:fixed;right:9.5rem;top:1rem;z-index:5;display:inline-flex;align-items:center;gap:.45rem;padding:.35rem .75rem;background:rgba(23,19,14,.88);border:1px solid #c69239;border-radius:.3rem;color:#f4ead5;font:600 13px/1.2 "Playfair Display",Georgia,serif;box-shadow:0 4px 15px rgba(0,0,0,.6);pointer-events:none;user-select:none;transition:border-color .3s ease;';
          }
        }
        const initial = WalletService.getSyncBalance();
        this.currentBalance = initial;
        wallet.textContent = `💰 ${formatCoins(initial)} Coins`;
        if (typeof root.appendChild === 'function') {
          root.appendChild(wallet);
          this.walletElement = wallet;
        }

        this.unsubscribeWallet = WalletService.onBalanceChanged((balance, delta) => {
          this.setWallet(balance, undefined, delta);
        });
      }
    } catch (error) {
      console.error('Could not create game HUD.', error);
    }
  }

  setWallet(coins: string | number | bigint, _name?: string, delta?: number): void {
    try {
      const balance = typeof coins === 'bigint' ? coins : BigInt(String(coins || '0'));
      this.currentBalance = balance;
      if (this.walletElement) {
        const deltaNote = delta && delta !== 0 ? ` (${delta > 0 ? '+' : ''}${formatCoins(delta)})` : '';
        this.walletElement.textContent = `💰 ${formatCoins(balance)} Coins${deltaNote}`;
        if (delta && delta !== 0 && 'style' in this.walletElement && typeof this.walletElement.style === 'object') {
          this.walletElement.style.borderColor = delta > 0 ? '#48c774' : '#e06c75';
          setTimeout(() => {
            if (this.walletElement && 'style' in this.walletElement && typeof this.walletElement.style === 'object') {
              this.walletElement.style.borderColor = '#c69239';
            }
          }, 1200);
        }
      }
    } catch {
      // Guard against invalid bigints
    }
  }

  update(
    position: PlayerPosition,
    nearbyPoiName?: string,
    minimap?: MinimapPoint,
    missingModelCount = 0,
    blockedReason?: 'terrain' | 'obstacle' | 'boundary',
    contextLabel?: string
  ): void {
    if (!this.element) return;
    this.element.setAttribute('data-interior', String(Boolean(contextLabel)));
    const detail = contextLabel
      ? `Valentine · ${contextLabel}${nearbyPoiName ? ` · ${nearbyPoiName} · F: Interagieren` : ''}`
      : nearbyPoiName
        ? `Valentine · ${nearbyPoiName} · F: Interagieren`
        : this.debug
          ? `Valentine · X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)}`
          : 'Valentine · Allein unterwegs';
    const help='WASD / Linksklick: Laufen · Shift: draußen rennen · Q/E / Rechtsziehen: Drehen · F: Aktion · Esc: Menü';
    this.element.setAttribute('title',help+(this.debug?` · Karte ${minimap?.x.toFixed(1)??'?'} / ${minimap?.y.toFixed(1)??'?'} · Quellinventur: ${missingModelCount} offene Referenzen`:''));
    const controls=nearbyPoiName?' · Esc: Menü':' · F: Aktion · Esc: Menü';
    const message =
      detail +
      (blockedReason === 'terrain'
        ? ' · Gelände fehlt in dieser Richtung'
        : blockedReason === 'obstacle'
          ? ' · Gebäude im Weg'
          : blockedReason === 'boundary'
            ? ' · Ortsgrenze erreicht'
            : '') +
      controls;
    // Screen readers receive state changes, rather than a repeat for every stationary frame.
    if (this.element.textContent !== message) this.element.textContent = message;
  }

  dispose(): void {
    try {
      this.unsubscribeWallet?.();
      this.element?.remove();
      this.walletElement?.remove();
    } catch (error) {
      console.error('Could not dispose game HUD.', error);
    }
  }
}
