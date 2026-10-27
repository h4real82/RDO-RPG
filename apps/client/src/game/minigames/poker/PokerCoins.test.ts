import { describe, it, expect, beforeEach } from 'vitest';
import { PokerPractice, evaluateCurrentHand, formatCard, type PokerVariant } from './PokerRules';
import { WalletService } from '../../economy/WalletService';
import { LocalAccountStore, createDefaultGuestProfile } from '../../economy/LocalAccountStore';

describe('Poker Custom Stacks & Hand Evaluation', () => {
  const customConfig: PokerVariant = {
    gameId: 'poker',
    rulesVersion: 'valentine-holdem-practice-v1',
    startingChips: 200,
    smallBlind: 5,
    bigBlind: 10,
  };

  it('supports custom stacks and posts blinds properly', () => {
    const game = new PokerPractice(() => 0.5, customConfig, [200, 200]);
    expect(game.stacks).toEqual([195, 190]);
    expect(game.pot).toBe(15);
    expect(game.stacks[0] + game.stacks[1] + game.pot).toBe(400);
  });

  it('evaluates pre-flop pocket pairs and suited connectors', () => {
    expect(evaluateCurrentHand(['AS', 'AH'], [])).toContain('Pocket-Paar (Assen)');
    expect(evaluateCurrentHand(['KS', 'QS'], [])).toBe('K-Q suited');
    expect(evaluateCurrentHand(['7D', '2C'], [])).toBe('7-2 offsuit');
  });

  it('evaluates made hands with community board', () => {
    const hole = ['AS', 'KS'];
    const board = ['QS', 'JS', 'TS'];
    expect(evaluateCurrentHand(hole, board)).toBe('Straight Flush');
  });

  it('formats cards with correct Western suit symbols and colors', () => {
    const heart = formatCard('AH');
    expect(heart.text).toBe('A♥');
    expect(heart.red).toBe(true);

    const spade = formatCard('KS');
    expect(spade.text).toBe('K♠');
    expect(spade.red).toBe(false);

    const hidden = formatCard('??');
    expect(hidden.text).toBe('◆');
    expect(hidden.red).toBe(false);
  });
});

describe('Poker Real Coin Wagering & Settlement Loop', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);
  });

  it('reserves buy-in from wallet and deposits cashout profit', async () => {
    expect(WalletService.getSyncBalance()).toBe(5000n);

    // Buy in for 200 Coins
    const buyInSuccess = await WalletService.reserveBet(200);
    expect(buyInSuccess).toBe(true);
    expect(WalletService.getSyncBalance()).toBe(4800n);

    // Simulate winning session: cashout with 290 chips (+90 net profit)
    const finalBalance = await WalletService.settlePot(290, 'poker-cashout');
    expect(finalBalance).toBe(5090n);
    expect(WalletService.getSyncBalance()).toBe(5090n);
  });

  it('protects against wallet overdraft if buy-in exceeds balance', async () => {
    LocalAccountStore.adjustCoins(-4950, 'drain');
    expect(WalletService.getSyncBalance()).toBe(50n);

    // Attempting 200 buy-in must fail
    const buyInSuccess = await WalletService.reserveBet(200);
    expect(buyInSuccess).toBe(false);
    expect(WalletService.getSyncBalance()).toBe(50n);
  });
});

