import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateArrowFlight,
  evaluateTargetScore,
  parseArcheryVariant,
  ArcheryTournament,
  DEFAULT_ARCHERY_VARIANT
} from './ArcheryRules';
import { LocalAccountStore, createDefaultGuestProfile } from '../../economy/LocalAccountStore';
import { WalletService } from '../../economy/WalletService';

describe('Archery Physics & Target Ring Evaluator (H4R-90)', () => {
  it('calculates arrow flight with charge velocity, gravity drop and wind drift', () => {
    // Optimal draw: 1.2s, no wind
    const optimalFlight = calculateArrowFlight(1.2, 0, 0, 30, 0);
    expect(optimalFlight.flightTime).toBeGreaterThan(0.4);
    expect(optimalFlight.flightTime).toBeLessThan(0.8);
    expect(optimalFlight.drop).toBeGreaterThan(0);
    expect(optimalFlight.windDrift).toBe(0);
    expect(optimalFlight.fatigueJitter).toBe(0);

    // Partial draw: 0.5s -> slower arrow, larger drop
    const weakFlight = calculateArrowFlight(0.5, 0, 0, 30, 0);
    expect(weakFlight.flightTime).toBeGreaterThan(optimalFlight.flightTime);
    expect(weakFlight.drop).toBeGreaterThan(optimalFlight.drop);

    // Wind drift: positive wind drifts arrow eastward (positive X)
    const windFlight = calculateArrowFlight(1.2, 0, 0, 30, 2.0);
    expect(windFlight.windDrift).toBeGreaterThan(0);
    expect(windFlight.targetHitX).toBeGreaterThan(0);
  });

  it('introduces arm fatigue jitter when bow is over-held beyond 1.4s', () => {
    const calmShot = calculateArrowFlight(1.0, 0, 0, 30, 0);
    expect(calmShot.fatigueJitter).toBe(0);

    const fatiguedShot = calculateArrowFlight(2.2, 0, 0, 30, 0);
    expect(fatiguedShot.fatigueJitter).toBeGreaterThan(0);
  });

  it('accurately evaluates concentric target rings from 10 points to miss', () => {
    // Bullseye 10 points
    const bullseye = evaluateTargetScore(0.02, -0.03);
    expect(bullseye.points).toBe(10);
    expect(bullseye.label).toContain('10');

    // Gold 9 points
    const gold = evaluateTargetScore(0.12, 0.05);
    expect(gold.points).toBe(9);

    // Red 8 and 7 points
    const redInner = evaluateTargetScore(0.25, 0.10);
    expect(redInner.points).toBe(8);
    const redOuter = evaluateTargetScore(0.40, 0.15);
    expect(redOuter.points).toBe(7);

    // Blue 6 points
    const blue = evaluateTargetScore(0.55, 0.20);
    expect(blue.points).toBe(6);

    // Black 4 points
    const black = evaluateTargetScore(0.90, 0.10);
    expect(black.points).toBe(4);

    // White 2 points
    const white = evaluateTargetScore(1.25, 0.10);
    expect(white.points).toBe(2);

    // Miss (dist > 1.50m)
    const miss = evaluateTargetScore(2.0, 1.5);
    expect(miss.points).toBe(0);
    expect(miss.label).toContain('Fehlschuss');
  });
});

describe('Archery Tournament Engine & Round Rules (H4R-90)', () => {
  it('manages a 10-arrow round and tracks progress', () => {
    const tournament = new ArcheryTournament(DEFAULT_ARCHERY_VARIANT);
    expect(tournament.shotsRemaining).toBe(10);
    expect(tournament.isComplete).toBe(false);

    tournament.startRound();
    expect(tournament.roundActive).toBe(true);

    // Fire 5 shots
    for (let i = 0; i < 5; i++) {
      tournament.shoot(1.15, 0, 0);
    }
    expect(tournament.shots.length).toBe(5);
    expect(tournament.shotsRemaining).toBe(5);
    expect(tournament.isComplete).toBe(false);

    // Fire remaining 5 shots
    for (let i = 0; i < 5; i++) {
      tournament.shoot(1.15, 0, 0);
    }
    expect(tournament.shots.length).toBe(10);
    expect(tournament.shotsRemaining).toBe(0);
    expect(tournament.isComplete).toBe(true);
    expect(tournament.roundActive).toBe(false);

    // Shooting when round is over throws
    expect(() => tournament.shoot(1.15, 0, 0)).toThrow(/Keine aktive Bogenschießen-Runde/);
  });

  it('evaluates tournament prize tiers based on total points', () => {
    const tournament = new ArcheryTournament(DEFAULT_ARCHERY_VARIANT);
    tournament.startRound();

    // Rig 10 bullseye hits (10 * 10 = 100 points) -> Gold
    for (let i = 0; i < 10; i++) {
      tournament.shots.push({
        shotNumber: i + 1,
        aimX: 0, aimY: 0, hitX: 0.02, hitY: 0.01,
        points: 10,
        zone: evaluateTargetScore(0.02, 0.01),
        wind: { speed: 0, direction: 'Windstill', windX: 0 }
      });
    }

    const goldPrize = tournament.evaluatePrize();
    expect(goldPrize.tier).toBe('gold');
    expect(goldPrize.payout).toBe(120);

    // Test Silver (8 * 10 = 80 points)
    tournament.shots = tournament.shots.slice(0, 8);
    const silverPrize = tournament.evaluatePrize();
    expect(silverPrize.tier).toBe('silver');
    expect(silverPrize.payout).toBe(60);

    // Test Bronze (6 * 10 = 60 points)
    tournament.shots = tournament.shots.slice(0, 6);
    const bronzePrize = tournament.evaluatePrize();
    expect(bronzePrize.tier).toBe('bronze');
    expect(bronzePrize.payout).toBe(35);

    // Test Under 50 points -> No prize
    tournament.shots = tournament.shots.slice(0, 3);
    const noPrize = tournament.evaluatePrize();
    expect(noPrize.tier).toBe('none');
    expect(noPrize.payout).toBe(0);
  });
});

describe('Archery Coin Buy-In & Settlement (H4R-90 & H4R-88)', () => {
  beforeEach(() => {
    const profile = createDefaultGuestProfile();
    profile.coins = '500';
    LocalAccountStore.saveProfile(profile);
    WalletService.setActiveProfile(null, false);
  });

  it('reserves 25 Coins tournament fee and settles winnings into wallet', async () => {
    expect(WalletService.getSyncBalance()).toBe(500n);

    const fee = 25;
    const reserved = await WalletService.reserveBet(fee, 'archery-tournament');
    expect(reserved).toBe(true);
    expect(WalletService.getSyncBalance()).toBe(475n);

    // Settle Gold prize of 120 Coins
    const prize = 120;
    const settled = await WalletService.settlePot(prize, 'archery-prize');
    expect(settled).toBe(595n);
    expect(WalletService.getSyncBalance()).toBe(595n); // 475 + 120
  });

  it('refunds tournament fee without loss if player leaves range mid-game', async () => {
    const fee = 25;
    await WalletService.reserveBet(fee, 'archery-tournament');
    expect(WalletService.getSyncBalance()).toBe(475n);

    await WalletService.refund(fee, 'archery-disconnect-refund');
    expect(WalletService.getSyncBalance()).toBe(500n);
  });

  it('prevents starting tournament when balance is lower than entry fee', async () => {
    const profile = createDefaultGuestProfile();
    profile.coins = '10'; // Less than 25 fee
    LocalAccountStore.saveProfile(profile);
    WalletService.setActiveProfile(null, false);

    const reserved = await WalletService.reserveBet(25, 'archery-tournament');
    expect(reserved).toBe(false);
    expect(WalletService.getSyncBalance()).toBe(10n);
  });
});

