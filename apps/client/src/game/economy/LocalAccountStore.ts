import type { PlayerAccount } from '@rdo-rpg/shared';
import { STARTING_COINS, BANK_CATALOG, BANK_CATALOG_VERSION, saleQuote } from '@rdo-rpg/shared';

const STORAGE_KEY = 'rdo_local_player_account_v1';
export const ACCOUNT_CHANGED_EVENT = 'rdo-account-changed';

export function createDefaultGuestProfile(): PlayerAccount {
  return {
    id: 'local-outlaw',
    displayName: 'Outlaw',
    characterId: 'char-local-outlaw',
    coins: String(STARTING_COINS),
    inventory: [
      { id: 'pot-red-0', itemId: 'potion_red', quantity: 3, slot: 0 }
    ],
    discord: null
  };
}

export class LocalAccountStore {
  private static cached: PlayerAccount | null = null;

  static getProfile(): PlayerAccount {
    if (this.cached) return this.cached;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as PlayerAccount;
          if (parsed && typeof parsed.coins === 'string' && Array.isArray(parsed.inventory)) {
            this.cached = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read local account from storage, using memory fallback.', e);
    }
    const def = createDefaultGuestProfile();
    this.saveProfile(def);
    return def;
  }

  static saveProfile(profile: PlayerAccount, deltaCoins = 0): void {
    this.cached = profile;
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        }
        window.dispatchEvent(new CustomEvent(ACCOUNT_CHANGED_EVENT, {
          detail: { profile, deltaCoins }
        }));
      }
    } catch (e) {
      console.warn('Could not save local account to storage.', e);
    }
  }

  static sellItem(itemId: string): { profile: PlayerAccount; coinsGained: number; quote: { label: string; coins: number } } {
    const profile = this.getProfile();
    const item = profile.inventory.find(i => i.id === itemId || i.itemId === itemId);
    if (!item || item.quantity <= 0) {
      throw new Error('item_unavailable');
    }
    const quote = saleQuote(item.itemId);
    if (!quote) {
      throw new Error('item_not_sellable');
    }

    item.quantity -= 1;
    const current = BigInt(profile.coins || '0');
    const gained = BigInt(quote.coins);
    const updated = current + gained;
    profile.coins = String(updated);

    this.saveProfile(profile, quote.coins);
    return { profile, coinsGained: quote.coins, quote };
  }

  static adjustCoins(delta: number | bigint, reason = 'gameplay'): { profile: PlayerAccount; newBalance: bigint } {
    const profile = this.getProfile();
    const current = BigInt(profile.coins || '0');
    const change = BigInt(delta);
    if (current + change < 0n) {
      throw new Error('insufficient_coins');
    }
    const updated = current + change;
    profile.coins = String(updated);

    this.saveProfile(profile, Number(change));
    return { profile, newBalance: updated };
  }

  static setDisplayName(name: string): PlayerAccount {
    const profile = this.getProfile();
    profile.displayName = name.trim() || 'Outlaw';
    this.saveProfile(profile, 0);
    return profile;
  }

  static onAccountChanged(listener: (profile: PlayerAccount, deltaCoins?: number) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ profile: PlayerAccount; deltaCoins?: number }>;
      const detail = custom.detail ?? { profile: this.getProfile(), deltaCoins: 0 };
      listener(detail.profile, detail.deltaCoins);
    };
    window.addEventListener(ACCOUNT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, handler);
  }
}

