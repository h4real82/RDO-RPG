// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SALOON_DRINKS,
  findDrink,
  filterDrinks,
  purchaseDrink,
  SaloonBar
} from './SaloonBar';
import { WalletService } from '../economy/WalletService';
import { LocalAccountStore, createDefaultGuestProfile } from '../economy/LocalAccountStore';

describe('SaloonBar Drink Catalog & Requirements', () => {
  it('contains exactly 18 authentic drinks across the five categories (including Special-Drinks)', () => {
    expect(SALOON_DRINKS).toHaveLength(18);

    const categories = SALOON_DRINKS.map((d) => d.category);
    expect(categories.filter((c) => c === 'Bier')).toHaveLength(5);
    expect(categories.filter((c) => c === 'Wiskey')).toHaveLength(2);
    expect(categories.filter((c) => c === 'Likör')).toHaveLength(3);
    expect(categories.filter((c) => c === 'Schnaps')).toHaveLength(5);
    expect(categories.filter((c) => c === 'Special')).toHaveLength(3);
  });

  it('matches all 18 requested drink names precisely', () => {
    const names = SALOON_DRINKS.map((d) => d.name);

    // 5 Bier
    expect(names).toContain('Lübzer Pils');
    expect(names).toContain('Wiküler Pils');
    expect(names).toContain('Heineken Export');
    expect(names).toContain('Paulaner Weissbier');
    expect(names).toContain('Paulaner Hefe-Bier');

    // 2 Wiskey
    expect(names).toContain('Jack Daniels');
    expect(names).toContain('Jim Beam');

    // 3 Likör
    expect(names).toContain('Jägermeister');
    expect(names).toContain('Túnel');
    expect(names).toContain('Eskoreal');

    // 5 Schnaps
    expect(names).toContain('Williams');
    expect(names).toContain('Kirsch');
    expect(names).toContain('Marille');
    expect(names).toContain('Uralte Marille');
    expect(names).toContain('Obstler');

    // 3 Special-Drinks
    expect(names).toContain('Meskal mit Wurm (Haluzinierend)');
    expect(names).toContain('Absinth mit viel Wehrmut');
    expect(names).toContain('Bleichmittel aus dem Baumarkt');
  });

  it('ensures each drink has valid price, flavor text, and consumption effect', () => {
    const ids = new Set<string>();
    for (const drink of SALOON_DRINKS) {
      expect(ids.has(drink.id)).toBe(false);
      ids.add(drink.id);

      expect(drink.price).toBeGreaterThan(0);
      expect(drink.flavor.trim().length).toBeGreaterThan(10);
      expect(drink.effect.trim().length).toBeGreaterThan(5);
    }
  });

  it('filters drinks accurately by category', () => {
    expect(filterDrinks('Bier')).toHaveLength(5);
    expect(filterDrinks('Wiskey')).toHaveLength(2);
    expect(filterDrinks('Likör')).toHaveLength(3);
    expect(filterDrinks('Schnaps')).toHaveLength(5);
    expect(filterDrinks('Special')).toHaveLength(3);
    expect(filterDrinks('Alle')).toHaveLength(18);
  });

  it('finds drinks by ID or by name (case-insensitive)', () => {
    expect(findDrink('luebzer-pils')?.name).toBe('Lübzer Pils');
    expect(findDrink('jack daniels')?.category).toBe('Wiskey');
    expect(findDrink('Jägermeister')?.price).toBe(10);
    expect(findDrink('meskal-mit-wurm')?.price).toBe(18);
    expect(findDrink('Absinth mit viel Wehrmut')?.category).toBe('Special');
    expect(findDrink('bleichmittel-baumarkt')?.price).toBe(2);
    expect(findDrink('unknown-drink')).toBeUndefined();
  });
});

describe('SaloonBar Ordering & Coin Wagering Integration', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);
  });

  it('purchases a beer, deducts coins, and returns barkeeper serving feedback', async () => {
    const startBal = WalletService.getSyncBalance();
    expect(startBal).toBe(5000n);

    const result = await purchaseDrink('luebzer-pils');
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(4995n);
    expect(result.message).toContain('Lübzer Pils');
    expect(result.message).toContain('-5 Coins');
    expect(result.effect).toBe('Erfrischt die Kehle und belebt den Geist.');

    // Verifies wallet persisted
    expect(WalletService.getSyncBalance()).toBe(4995n);
  });

  it('purchases Meskal mit Wurm with hallucinogenic effect', async () => {
    const result = await purchaseDrink('meskal-mit-wurm');
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(4982n); // 5000 - 18
    expect(result.effect).toContain('Haluzinierend');
  });

  it('purchases Bleichmittel aus dem Baumarkt for 2 Coins', async () => {
    const result = await purchaseDrink('bleichmittel-baumarkt');
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(4998n); // 5000 - 2
    expect(result.effect).toContain('Brennt wie die Hölle');
  });

  it('rejects order and preserves balance when wallet funds are insufficient', async () => {
    // Reduce balance down to 4 coins
    LocalAccountStore.adjustCoins(-4996, 'spend-down');
    expect(WalletService.getSyncBalance()).toBe(4n);

    // Absinth costs 20 coins -> should fail
    const result = await purchaseDrink('absinth-wehrmut');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Nicht genügend Coins');
    expect(result.newBalance).toBe(4n);
    expect(WalletService.getSyncBalance()).toBe(4n);
  });

  it('renders SaloonBar dialog in DOM with all 18 drinks', async () => {
    let changeNotified = false;
    const bar = new SaloonBar(() => {
      changeNotified = true;
    });

    const root = document.createElement('div');
    document.body.appendChild(root);

    const dialog = bar.open(root);
    expect(dialog.isOpen).toBe(true);
    expect(root.querySelector('.rdo-venue__balance-pill')?.textContent).toContain('5.000 Coins');

    const cards = root.querySelectorAll('.rdo-venue__drink-card');
    expect(cards.length).toBe(18);

    // Order first beer
    const firstOrderBtn = cards[0]?.querySelector('button') as HTMLButtonElement;
    expect(firstOrderBtn).not.toBeNull();
    firstOrderBtn.click();

    // Allow promise microtasks to settle
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(changeNotified).toBe(true);
    expect(WalletService.getSyncBalance()).toBe(4995n);

    dialog.close();
    expect(dialog.isOpen).toBe(false);
    root.remove();
  });
});
