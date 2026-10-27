import { VenueDialog, text } from '../../venues/VenueDialog';
import { WalletService, formatCoins } from '../../economy/WalletService';
import {
  BlackjackGame,
  parseBlackjackVariant,
  calculateHandValue,
  formatCard,
  type RoundResult
} from './BlackjackRules';
import type { Venue } from '../types';

export function create(parent: HTMLElement, variant: unknown, _venue: Venue) {
  const config = parseBlackjackVariant(variant);
  let dialog: VenueDialog | undefined;
  let game = new BlackjackGame(config);

  let selectedBet = 25;
  let activeWager = 0;
  let lastResult: RoundResult | undefined;

  const refundActiveWager = async () => {
    if (activeWager > 0) {
      const refund = activeWager;
      activeWager = 0;
      await WalletService.refund(refund, 'blackjack-disconnect-refund');
    }
  };

  const render = () => {
    if (!dialog) return;
    const d = dialog;
    d.content.replaceChildren();

    const walletBalance = WalletService.getSyncBalance();

    // Top status / Wallet Bar
    const headerBox = document.createElement('div');
    headerBox.className = 'rdo-venue__bar-header';
    d.content.append(headerBox);

    const balPill = text('div', `💰 Dein Guthaben: ${formatCoins(walletBalance)} Coins`, headerBox);
    balPill.className = 'rdo-venue__balance-pill';

    if (activeWager > 0) {
      const betPill = text('span', `🎲 Aktiver Einsatz: 💰 ${activeWager} Coins`, headerBox);
      betPill.className = 'rdo-venue__drink-tag';
      betPill.style.marginLeft = '12px';
      betPill.style.borderColor = '#e4bd67';
      betPill.style.color = '#e4bd67';
    }

    // Blackjack Table Container
    const table = document.createElement('div');
    table.className = 'rdo-poker__table';
    table.style.background = 'radial-gradient(ellipse at center, #1b382b 0%, #0d1e16 85%, #050d09 100%)';
    table.style.border = '2px solid #8c754c';
    table.style.borderRadius = '8px';
    table.style.padding = '16px';
    table.style.margin = '14px 0';
    table.style.boxShadow = 'inset 0 0 30px #000, 0 8px 30px #0008';
    d.content.append(table);

    // Dealer Area
    const dealerArea = document.createElement('div');
    dealerArea.style.borderBottom = '1px dashed #4b6657';
    dealerArea.style.paddingBottom = '12px';
    dealerArea.style.marginBottom = '14px';
    table.append(dealerArea);

    const dealerHeader = document.createElement('div');
    dealerHeader.style.display = 'flex';
    dealerHeader.style.justifyContent = 'space-between';
    dealerHeader.style.alignItems = 'center';
    dealerArea.append(dealerHeader);

    text('strong', '🎩 Saloon-Dealer (Doc Holliday)', dealerHeader);
    const dealerVal = calculateHandValue(game.dealerCards);
    const dealerScoreText = game.dealerRevealed
      ? `Punkte: ${dealerVal.total}${dealerVal.isBust ? ' (Überkauft!)' : ''}`
      : game.dealerCards.length > 0
        ? `Sichtbar: ${calculateHandValue([game.dealerCards[0]]).total}`
        : 'Wartet auf Einsatz';
    text('small', dealerScoreText, dealerHeader);

    const dealerCardRow = document.createElement('div');
    dealerCardRow.className = 'rdo-poker__cards';
    dealerCardRow.style.margin = '8px 0 0';
    dealerArea.append(dealerCardRow);

    if (game.dealerCards.length === 0) {
      text('small', 'Karten werden nach Einsatz verdeckt ausgeteilt.', dealerCardRow);
    } else {
      for (const card of game.dealerCards) {
        const cardDisplay = formatCard(card);
        const cardEl = document.createElement('div');
        cardEl.className = 'rdo-poker__card';
        cardEl.dataset.red = String(cardDisplay.red);
        if (cardDisplay.hidden) {
          cardEl.style.background = '#2e1919';
          cardEl.style.color = '#8c754c';
          cardEl.textContent = '🂠';
        } else {
          cardEl.textContent = cardDisplay.text;
        }
        dealerCardRow.append(cardEl);
      }
    }

    // Player Area
    const playerArea = document.createElement('div');
    table.append(playerArea);

    const playerHeader = document.createElement('div');
    playerHeader.style.display = 'flex';
    playerHeader.style.justifyContent = 'space-between';
    playerHeader.style.alignItems = 'center';
    playerArea.append(playerHeader);

    text('strong', '🤠 Deine Hand', playerHeader);
    const playerVal = calculateHandValue(game.playerCards);
    const playerScoreText = game.playerCards.length > 0
      ? `Punkte: ${playerVal.total}${playerVal.isSoft ? ' (Soft)' : ''}${playerVal.isBlackjack ? ' (BLACKJACK!)' : ''}${playerVal.isBust ? ' (Überkauft!)' : ''}`
      : 'Noch keine Karten';
    text('small', playerScoreText, playerHeader);

    const playerCardRow = document.createElement('div');
    playerCardRow.className = 'rdo-poker__cards';
    playerCardRow.style.margin = '8px 0 0';
    playerArea.append(playerCardRow);

    if (game.playerCards.length === 0) {
      text('small', 'Wähle deinen Chip-Einsatz und drücke auf „Karten geben“.', playerCardRow);
    } else {
      for (const card of game.playerCards) {
        const cardDisplay = formatCard(card);
        const cardEl = document.createElement('div');
        cardEl.className = 'rdo-poker__card';
        cardEl.dataset.red = String(cardDisplay.red);
        cardEl.textContent = cardDisplay.text;
        playerCardRow.append(cardEl);
      }
    }

    // Round Results Banner
    if (lastResult) {
      const banner = document.createElement('div');
      banner.style.padding = '10px 14px';
      banner.style.margin = '10px 0';
      banner.style.borderRadius = '4px';
      banner.style.fontWeight = 'bold';
      banner.style.fontSize = '15px';
      if (lastResult.outcome.includes('win') || lastResult.outcome.includes('blackjack') || lastResult.outcome.includes('bust') && lastResult.outcome === 'dealer_bust') {
        banner.style.background = '#1a3d24';
        banner.style.border = '1px solid #4ade80';
        banner.style.color = '#86efac';
      } else if (lastResult.outcome === 'push') {
        banner.style.background = '#2d2e16';
        banner.style.border = '1px solid #eab308';
        banner.style.color = '#fde047';
      } else {
        banner.style.background = '#3d1a1d';
        banner.style.border = '1px solid #f87171';
        banner.style.color = '#fca5a5';
      }
      banner.textContent = lastResult.message;
      d.content.append(banner);
    }

    // Controls Area
    const controlSection = document.createElement('div');
    controlSection.style.margin = '14px 0';
    d.content.append(controlSection);

    if (!game.roundActive) {
      // Betting Phase Controls
      text('strong', '💰 Wähle deinen Einsatz für die nächste Hand:', controlSection);
      const betRow = document.createElement('div');
      betRow.className = 'rdo-venue__categories';
      betRow.style.margin = '8px 0 14px';
      controlSection.append(betRow);

      const chipBets = [10, 25, 50, 100, 250];
      for (const chip of chipBets) {
        const chipBtn = d.button(`${chip} Coins`, () => {
          selectedBet = chip;
          render();
        }, betRow);
        chipBtn.className = 'rdo-cinema__seat-btn';
        if (selectedBet === chip) {
          chipBtn.classList.add('rdo-cinema__seat-btn--active');
        }
      }

      const canAfford = walletBalance >= BigInt(selectedBet);
      const dealBtn = d.button(
        canAfford ? `🃏 Karten geben (${selectedBet} Coins)` : `Zu wenig Coins (${selectedBet})`,
        async () => {
          if (walletBalance < BigInt(selectedBet)) {
            d.status.textContent = 'Nicht genügend Coins für diesen Einsatz.';
            return;
          }

          const reserved = await WalletService.reserveBet(selectedBet);
          if (!reserved) {
            d.status.textContent = 'Einsatz-Buchung fehlgeschlagen.';
            return;
          }

          activeWager = selectedBet;
          lastResult = undefined;

          const dealResult = game.deal(selectedBet);

          if (dealResult.roundImmediateEnd) {
            // Natural Blackjack or Push
            const res = dealResult.roundImmediateEnd;
            lastResult = res;
            activeWager = 0;
            if (res.payout > 0) {
              await WalletService.settlePot(res.payout, 'blackjack-natural');
            }
            d.status.textContent = res.message;
          } else {
            d.status.textContent = `Karten ausgeteilt. Du hast ${dealResult.playerValue.total} Punkte. Ziehen oder Halten?`;
          }

          render();
        },
        controlSection
      );
      dealBtn.disabled = !canAfford;
      dealBtn.style.fontWeight = 'bold';
      dealBtn.style.fontSize = '16px';
    } else {
      // In-Game Hand Action Controls
      const actionRow = document.createElement('div');
      actionRow.style.display = 'flex';
      actionRow.style.flexWrap = 'wrap';
      actionRow.style.gap = '10px';
      controlSection.append(actionRow);

      // HIT
      d.button('🃏 Karte ziehen (Hit)', () => {
        const hitResult = game.hit();
        if (hitResult.bustResult) {
          lastResult = hitResult.bustResult;
          activeWager = 0;
          d.status.textContent = hitResult.bustResult.message;
        } else {
          d.status.textContent = `Karte erhalten (${hitResult.newCard}). Aktuelle Punkte: ${hitResult.playerValue.total}.`;
        }
        render();
      }, actionRow);

      // STAND
      d.button('✋ Halten (Stand)', async () => {
        const standResult = game.stand();
        lastResult = standResult;
        const payout = standResult.payout;
        activeWager = 0;

        if (payout > 0) {
          await WalletService.settlePot(payout, 'blackjack-win');
        }

        d.status.textContent = standResult.message;
        render();
      }, actionRow);

      // DOUBLE DOWN
      if (game.canDouble()) {
        const canDoubleAfford = walletBalance >= BigInt(activeWager);
        const doubleBtn = d.button(
          canDoubleAfford ? `⚡ Verdoppeln (+${activeWager} Coins)` : `Zu wenig Coins zum Verdoppeln (+${activeWager})`,
          async () => {
            const extraBet = activeWager;
            const reserved = await WalletService.reserveBet(extraBet);
            if (!reserved) {
              d.status.textContent = 'Zusatzeinsatz fehlgeschlagen.';
              return;
            }

            activeWager += extraBet;
            const doubleResult = game.doubleDown();
            lastResult = doubleResult.result;
            const payout = doubleResult.result.payout;
            activeWager = 0;

            if (payout > 0) {
              await WalletService.settlePot(payout, 'blackjack-double-win');
            }

            d.status.textContent = doubleResult.result.message;
            render();
          },
          actionRow
        );
        doubleBtn.disabled = !canDoubleAfford;
      }
    }

    // Leave Table Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '20px';
    footer.style.borderTop = '1px solid #766443';
    footer.style.paddingTop = '12px';
    d.content.append(footer);

    d.button('Tisch verlassen', async () => {
      await refundActiveWager();
      d.close();
    }, footer);
  };

  return {
    get isOpen() {
      return Boolean(dialog?.isOpen);
    },
    open() {
      dialog = new VenueDialog(parent, 'Blackjack am Saloon-Tisch', () => {
        void refundActiveWager();
      });
      render();
    },
    dispose() {
      void refundActiveWager();
      dialog?.close();
      dialog = undefined;
    }
  };
}

