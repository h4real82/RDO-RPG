import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalAccountStore, createDefaultGuestProfile } from './LocalAccountStore';
import { WalletService, formatCoins } from './WalletService';

describe('LocalAccountStore & Economy', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
  });

  it('initializes default outlaw profile with exactly 5.000 starting coins', () => {
    const profile = LocalAccountStore.getProfile();
    expect(profile.displayName).toBe('Outlaw');
    expect(profile.coins).toBe('5000');
    expect(profile.inventory.find((i) => i.itemId === 'potion_red')?.quantity).toBe(3);
  });

  it('sells red potion at Valentine Bank rate (+25 coins) and reduces inventory', () => {
    const result = LocalAccountStore.sellItem('pot-red-0');
    expect(result.coinsGained).toBe(25);
    expect(result.profile.coins).toBe('5025');
    const pot = result.profile.inventory.find((i) => i.itemId === 'potion_red');
    expect(pot?.quantity).toBe(2);
  });

  it('prevents overdraft when subtracting coins', () => {
    expect(() => LocalAccountStore.adjustCoins(-6000, 'overdraft-test')).toThrow('insufficient_coins');
    // Balance remains 5000
    expect(LocalAccountStore.getProfile().coins).toBe('5000');
  });

  it('updates display name and persists', () => {
    const updated = LocalAccountStore.setDisplayName('Arthur Morgan');
    expect(updated.displayName).toBe('Arthur Morgan');
    expect(LocalAccountStore.getProfile().displayName).toBe('Arthur Morgan');
  });
});

describe('WalletService', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);
  });

  it('formats coins with German thousand separators', () => {
    expect(formatCoins(5000)).toBe('5.000');
    expect(formatCoins(5025)).toBe('5.025');
    expect(formatCoins(1000000)).toBe('1.000.000');
  });

  it('keeps the supplied wager reason when reserving local practice coins',async()=>{
    const adjust=vi.spyOn(LocalAccountStore,'adjustCoins');
    try {
      expect(await WalletService.reserveBet(25,'archery-tournament')).toBe(true);
      expect(adjust).toHaveBeenCalledWith(-25,'archery-tournament');
    } finally {adjust.mockRestore();}
  });

  it('reserves minigame bet and settles pot accurately', async () => {
    expect(WalletService.getSyncBalance()).toBe(5000n);

    // Bet 500
    const betOk = await WalletService.reserveBet(500);
    expect(betOk).toBe(true);
    expect(WalletService.getSyncBalance()).toBe(4500n);

    // Bet too much
    const overBet = await WalletService.reserveBet(5000);
    expect(overBet).toBe(false);
    expect(WalletService.getSyncBalance()).toBe(4500n);

    // Settle pot with 1000 won
    const newBal = await WalletService.settlePot(1000, 'poker-pot');
    expect(newBal).toBe(5500n);
    expect(WalletService.getSyncBalance()).toBe(5500n);
  });
});

