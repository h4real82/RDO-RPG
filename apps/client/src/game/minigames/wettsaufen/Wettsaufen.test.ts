import { describe, it, expect, beforeEach } from 'vitest';
import {
  drinkRound,
  calculateInputDistortionLag,
  parseWettsaufenVariant,
  CounterDuelGame,
  DRINKS,
  DEFAULT_WETTSAUFEN_VARIANT,
  type DrunkardState
} from './WettsaufenRules';
import { LocalAccountStore, createDefaultGuestProfile } from '../../economy/LocalAccountStore';
import { WalletService } from '../../economy/WalletService';

describe('Wettsaufen Drinks & Consumption Mechanics (H4R-90)', () => {
  it('correctly reduces energy and increases intoxication per drink', () => {
    const start: DrunkardState = { name: 'Arthur', energy: 100, intoxication: 0, drinksConsumed: 0 };

    // Standard Beer with good QTE
    const resBeer = drinkRound(start, 'beer', 'good');
    expect(resBeer.state.energy).toBe(100 - DRINKS.beer.energyCost);
    expect(resBeer.state.intoxication).toBe(DRINKS.beer.alcoholPct);
    expect(resBeer.isKO).toBe(false);

    // Hard Moonshine with perfect QTE (reduced energy cost)
    const resMoonshine = drinkRound(start, 'moonshine', 'perfect');
    expect(resMoonshine.energyLost).toBeLessThan(DRINKS.moonshine.energyCost);
    expect(resMoonshine.state.intoxication).toBe(DRINKS.moonshine.alcoholPct);

    // Mezcal with missed QTE (double energy cost)
    const resMezcal = drinkRound(start, 'mezcal', 'miss');
    expect(resMezcal.energyLost).toBe(DRINKS.mezcal.energyCost * 2);
  });

  it('detects KO when energy falls to 0', () => {
    const lowEnergy: DrunkardState = { name: 'Sean', energy: 15, intoxication: 70, drinksConsumed: 4 };

    // Heavy drink depletes remaining energy to 0
    const res = drinkRound(lowEnergy, 'moonshine', 'good');
    expect(res.state.energy).toBe(0);
    expect(res.isKO).toBe(true);
  });

  it('calculates input distortion / reaction lag at higher intoxication levels', () => {
    expect(calculateInputDistortionLag(10)).toBe(0); // Sober
    expect(calculateInputDistortionLag(50)).toBeGreaterThan(50); // Tipsy
    expect(calculateInputDistortionLag(100)).toBe(300); // Hammered (capped at 300ms)
  });
});

describe('CounterDuelGame Duel Rules & AI (H4R-90)', () => {
  it('validates bet bounds on starting duel', () => {
    const game = new CounterDuelGame(DEFAULT_WETTSAUFEN_VARIANT, 'Onkel Bill');
    expect(() => game.startDuel(5)).toThrow(/zwischen 15 und 150/);
    expect(() => game.startDuel(300)).toThrow(/zwischen 15 und 150/);

    game.startDuel(30);
    expect(game.roundActive).toBe(true);
    expect(game.currentBet).toBe(30);
  });

  it('resolves player victory when opponent collapses first', () => {
    const game = new CounterDuelGame(DEFAULT_WETTSAUFEN_VARIANT, 'Onkel Bill');
    game.startDuel(50);

    // Rig opponent to low energy
    game.opponent.energy = 5;
    game.player.energy = 80;

    const res = game.executeRound('whiskey', 'perfect');
    expect(res.opponentResult.isKO).toBe(true);
    expect(res.winner).toBe('player');
    expect(res.payout).toBe(100); // 50 * 2
    expect(game.roundActive).toBe(false);
  });

  it('resolves defeat when player collapses first', () => {
    const game = new CounterDuelGame(DEFAULT_WETTSAUFEN_VARIANT, 'Onkel Bill');
    game.startDuel(50);

    // Rig player to low energy
    game.player.energy = 5;
    // Survives even the AI miss branch; this case is a single KO.
    game.opponent.energy = 100;

    const res = game.executeRound('mezcal', 'miss');
    expect(res.playerResult.isKO).toBe(true);
    expect(res.opponentResult.isKO).toBe(false);
    expect(res.winner).toBe('opponent');
    expect(res.payout).toBe(0);
    expect(game.roundActive).toBe(false);
  });

  it('resolves push when both contenders collapse simultaneously', () => {
    const game = new CounterDuelGame(DEFAULT_WETTSAUFEN_VARIANT, 'Onkel Bill');
    game.startDuel(30);

    game.player.energy = 5;
    game.opponent.energy = 5;

    const res = game.executeRound('mezcal', 'miss');
    expect(res.opponentResult.isKO).toBe(true);
    expect(res.playerResult.isKO).toBe(true);
    expect(res.winner).toBe('both_ko');
    expect(res.payout).toBe(30); // Bet returned
  });
});

describe('Wettsaufen Coin Wagering & Settlement (H4R-90 & H4R-88)', () => {
  beforeEach(() => {
    const profile = createDefaultGuestProfile();
    profile.coins = '500';
    LocalAccountStore.saveProfile(profile);
    WalletService.setActiveProfile(null, false);
  });

  it('atomically reserves bet and settles 2x winning payout into wallet', async () => {
    expect(WalletService.getSyncBalance()).toBe(500n);

    const bet = 75;
    const reserved = await WalletService.reserveBet(bet, 'wettsaufen-duel');
    expect(reserved).toBe(true);
    expect(WalletService.getSyncBalance()).toBe(425n);

    // Settle 2x win (150 Coins)
    const payout = 150;
    const settled = await WalletService.settlePot(payout, 'wettsaufen-win');
    expect(settled).toBe(575n);
    expect(WalletService.getSyncBalance()).toBe(575n);
  });

  it('refunds active wager on table leave or disconnect without loss', async () => {
    const bet = 30;
    await WalletService.reserveBet(bet, 'wettsaufen-duel');
    expect(WalletService.getSyncBalance()).toBe(470n);

    await WalletService.refund(bet, 'wettsaufen-disconnect-refund');
    expect(WalletService.getSyncBalance()).toBe(500n);
  });

  it('prevents starting duel when wallet has insufficient funds', async () => {
    const profile = createDefaultGuestProfile();
    profile.coins = '10';
    LocalAccountStore.saveProfile(profile);
    WalletService.setActiveProfile(null, false);

    const reserved = await WalletService.reserveBet(30, 'wettsaufen-duel');
    expect(reserved).toBe(false);
    expect(WalletService.getSyncBalance()).toBe(10n);
  });
});

