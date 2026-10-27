import type { PlayerAccount } from '@rdo-rpg/shared';
import { BANK_CATALOG, BANK_CATALOG_VERSION } from '@rdo-rpg/shared';
import { VenueDialog, text } from './VenueDialog';
import { LocalAccountStore } from '../economy/LocalAccountStore';
import { WalletService, formatCoins } from '../economy/WalletService';

type Snapshot = { profile: PlayerAccount; catalog: Record<string, { label: string; coins: number }>; catalogVersion: string };

/** One desk per runtime: pending intent IDs survive closing/reopening after response loss. */
export class BankDesk {
  private pending = new Map<string, string>();
  private abort?: AbortController;

  constructor(
    private changed: () => void = () => {},
    private request: typeof fetch = (url, init) => fetch(url, init)
  ) {}

  open(parent: HTMLElement) {
    this.abort?.abort();
    const abort = this.abort = new AbortController();
    const dialog = new VenueDialog(parent, 'Bankbeamter', () => abort.abort());

    const useLocal = () => {
      const profile = LocalAccountStore.getProfile();
      WalletService.setActiveProfile(profile, false);
      render({
        profile,
        catalog: BANK_CATALOG,
        catalogVersion: BANK_CATALOG_VERSION
      }, true);
    };

    const load = async () => {
      dialog.status.textContent = 'Inventar und Kontostand werden geladen …';
      dialog.content.replaceChildren();
      try {
        const response = await this.request('/api/me/bank', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: abort.signal
        });
        if (!dialog.isOpen) return;
        if (response.ok) {
          const data = await response.json() as Snapshot;
          if (!dialog.isOpen) return;
          WalletService.setActiveProfile(data.profile, true);
          render(data, false);
          return;
        }

        if (response.status === 401) {
          if (import.meta.env.DEV) {
            useLocal();
            return;
          }
          dialog.status.textContent = 'Bitte zuerst im Systemmenü anmelden. Danach den Bankbeamten erneut ansprechen.';
          dialog.button('Als Gast handeln (Lokal)', useLocal);
          dialog.button('Erneut laden', load);
          return;
        }

        // Backend unavailable (e.g. 503) -> local fallback
        useLocal();
      } catch {
        if (!dialog.isOpen) return;
        useLocal();
      }
    };

    const render = (data: Snapshot, isLocal = false) => {
      dialog.content.replaceChildren();
      dialog.status.textContent = isLocal ? 'Lokales Outlaw-Konto aktiv.' : '';
      text('h3', `${data.profile.displayName} · ${formatCoins(data.profile.coins)} Coins`, dialog.content);
      text('p', 'Ankauf pro Stück. Preise sind vorläufige Valentine-Spielwerte. Nicht gelistete Gegenstände bleiben im Inventar.', dialog.content);
      const list = document.createElement('div');
      list.className = 'rdo-venue__inventory';
      dialog.content.append(list);

      const items = data.profile.inventory.filter((item) => item.quantity > 0);
      if (!items.length) {
        text('p', 'Dein Inventar ist leer.', list);
      }

      for (const item of items) {
        const row = document.createElement('div');
        list.append(row);
        const quote = Object.prototype.hasOwnProperty.call(data.catalog, item.itemId)
          ? data.catalog[item.itemId]
          : undefined;
        text('span', `${quote?.label ?? item.itemId} × ${item.quantity}`, row);
        if (!quote) {
          text('small', 'Kein Ankauf', row);
          continue;
        }

        const key = data.profile.id + ':' + item.id;
        dialog.button(
          `${this.pending.has(key) ? 'Verkauf prüfen' : '1 verkaufen'} · ${formatCoins(quote.coins)} Coins`,
          async () => {
            for (const b of Array.from(dialog.content.querySelectorAll('button'))) b.disabled = true;

            if (isLocal) {
              try {
                const result = LocalAccountStore.sellItem(item.id);
                this.changed();
                WalletService.setActiveProfile(result.profile, false);
                render({ ...data, profile: result.profile }, true);
                dialog.status.textContent = `Verkauf verbucht (+${formatCoins(result.coinsGained)} Coins). Inventar und Coins sind aktualisiert.`;
              } catch {
                dialog.status.textContent = 'Verkauf nicht möglich.';
                render(data, true);
              }
              return;
            }

            const requestId = this.pending.get(key) ?? crypto.randomUUID();
            this.pending.set(key, requestId);
            dialog.status.textContent = 'Verkauf wird gebucht …';
            try {
              const response = await this.request('/api/me/bank/sell', {
                method: 'POST',
                credentials: 'same-origin',
                signal: abort.signal,
                headers: { 'Content-Type': 'application/json', 'X-RDO-Request': '1' },
                body: JSON.stringify({ itemId: item.id, requestId })
              });
              const body = await response.json();
              if (!dialog.isOpen) return;
              if (!response.ok) {
                if ([400, 401, 403, 409].includes(response.status)) this.pending.delete(key);
                await load();
                dialog.status.textContent = 'Verkauf nicht möglich. Inventar wurde neu geladen.';
                return;
              }
              this.pending.delete(key);
              this.changed();
              WalletService.setActiveProfile(body.profile, true);
              render({ ...data, profile: body.profile }, false);
              dialog.status.textContent = 'Verkauf verbucht. Inventar und Coins sind aktualisiert.';
            } catch {
              if (dialog.isOpen) {
                render(data, false);
                dialog.status.textContent = 'Antwort fehlt. „Verkauf prüfen“ wiederholt denselben Auftrag ohne doppelte Buchung.';
              }
            }
          },
          row
        );
      }
    };

    void load();
    return dialog;
  }

  dispose() {
    this.abort?.abort();
    this.pending.clear();
  }
}
