import type { PlayerAccount } from '@rdo-rpg/shared';
import { LocalAccountStore } from './LocalAccountStore';

export const WALLET_CHANGED_EVENT = 'rdo-wallet-changed';

export function formatCoins(amount: string | number | bigint): string {
  try {
    const num = typeof amount === 'bigint' ? amount : BigInt(String(amount || '0'));
    return num.toLocaleString('de-DE');
  } catch {
    return String(amount);
  }
}

export class WalletService {
  private static activeProfile: PlayerAccount | null = null;
  private static isServerAuthenticated = false;

  static setActiveProfile(profile: PlayerAccount | null, fromServer = false): void {
    this.activeProfile = profile;
    this.isServerAuthenticated = fromServer && Boolean(profile);
    this.emitChange(this.getSyncBalance(), 0);
  }

  static getSyncBalance(): bigint {
    if (this.isServerAuthenticated && this.activeProfile) {
      try {
        return BigInt(this.activeProfile.coins || '0');
      } catch {
        return 0n;
      }
    }
    const local = LocalAccountStore.getProfile();
    try {
      return BigInt(local.coins || '0');
    } catch {
      return 0n;
    }
  }

  static async getBalance(): Promise<bigint> {
    if (this.isServerAuthenticated) {
      try {
        const res = await fetch('/api/me/wallet', {
          credentials: 'same-origin',
          headers: { 'X-RDO-Request': '1' }
        });
        if (res.ok) {
          const data = await res.json() as { coins: string };
          if (data && typeof data.coins === 'string') {
            if (this.activeProfile) this.activeProfile.coins = data.coins;
            return BigInt(data.coins);
          }
        }
      } catch {
        // Fall back to cached / local
      }
    }
    return this.getSyncBalance();
  }

  static async reserveBet(amount: number, reason = 'minigame-bet'): Promise<boolean> {
    if (!Number.isSafeInteger(amount) || amount <= 0) return false;
    const balance = this.getSyncBalance();
    if (balance < BigInt(amount)) {
      return false;
    }

    if (this.isServerAuthenticated && this.activeProfile) {
      // In online mode, we reserve locally and settle with server minigame session
      const newBal = balance - BigInt(amount);
      this.activeProfile.coins = String(newBal);
      this.emitChange(newBal, -amount);
      return true;
    }

    try {
      const res = LocalAccountStore.adjustCoins(-amount, reason);
      this.emitChange(res.newBalance, -amount);
      return true;
    } catch {
      return false;
    }
  }

  static async settlePot(amount: number, reason = 'minigame-win'): Promise<bigint> {
    if (!Number.isSafeInteger(amount) || amount < 0) return this.getSyncBalance();

    if (this.isServerAuthenticated && this.activeProfile) {
      const newBal = this.getSyncBalance() + BigInt(amount);
      this.activeProfile.coins = String(newBal);
      this.emitChange(newBal, amount);
      return newBal;
    }

    const res = LocalAccountStore.adjustCoins(amount, reason);
    this.emitChange(res.newBalance, amount);
    return res.newBalance;
  }

  static async refund(amount: number, reason = 'minigame-refund'): Promise<bigint> {
    return this.settlePot(amount, reason);
  }

  private static emitChange(balance: bigint, delta = 0): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(WALLET_CHANGED_EVENT, {
      detail: { balance, delta, formatted: formatCoins(balance) }
    }));
  }

  static onBalanceChanged(listener: (newBalance: bigint, delta: number, formatted: string) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ balance: bigint; delta: number; formatted: string }>;
      const detail = custom.detail ?? {
        balance: this.getSyncBalance(),
        delta: 0,
        formatted: formatCoins(this.getSyncBalance())
      };
      listener(detail.balance, detail.delta, detail.formatted);
    };
    window.addEventListener(WALLET_CHANGED_EVENT, handler);
    return () => window.removeEventListener(WALLET_CHANGED_EVENT, handler);
  }
}

