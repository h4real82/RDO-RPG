import { VenueDialog, text } from '../../venues/VenueDialog';
import { WalletService, formatCoins } from '../../economy/WalletService';
import {
  CounterDuelGame,
  DRINKS,
  parseWettsaufenVariant,
  type DrinkType
} from './WettsaufenRules';
import type { Venue } from '../types';

export function create(parent: HTMLElement, variant: unknown, _venue: Venue) {
  const config = parseWettsaufenVariant(variant);
  let dialog: VenueDialog | undefined;
  let game = new CounterDuelGame(config, 'Onkel Bill');

  let selectedBet = 30;
  let activeWager = 0;
  let lastOutcomeMessage: string | undefined;
  let lastRoundResult: {
    playerQte: string;
    oppQte: string;
    drinkName: string;
  } | undefined;

  const refundActiveWager = async () => {
    if (activeWager > 0) {
      const refund = activeWager;
      activeWager = 0;
      await WalletService.refund(refund, 'wettsaufen-disconnect-refund');
    }
  };

  const render = () => {
    if (!dialog) return;
    const d = dialog;
    d.content.replaceChildren();

    const walletBalance = WalletService.getSyncBalance();

    // Top Header: Wallet & Status
    const headerBox = document.createElement('div');
    headerBox.className = 'rdo-venue__bar-header';
    d.content.append(headerBox);

    const balPill = text('div', `💰 Dein Guthaben: ${formatCoins(walletBalance)} Coins`, headerBox);
    balPill.className = 'rdo-venue__balance-pill';

    if (activeWager > 0) {
      const betPill = text('span', `🍺 Duell-Einsatz: 💰 ${activeWager} Coins`, headerBox);
      betPill.className = 'rdo-venue__drink-tag';
      betPill.style.marginLeft = '12px';
      betPill.style.borderColor = '#e4bd67';
      betPill.style.color = '#e4bd67';
    }

    // Saloon Bar Duel Tableau
    const duelTable = document.createElement('div');
    duelTable.style.background = 'radial-gradient(ellipse at center, #2b1a10 0%, #150c07 85%, #080402 100%)';
    duelTable.style.border = '2px solid #8c684c';
    duelTable.style.borderRadius = '8px';
    duelTable.style.padding = '16px';
    duelTable.style.margin = '14px 0';
    duelTable.style.boxShadow = 'inset 0 0 30px #000, 0 8px 30px #0008';
    d.content.append(duelTable);

    // Contenders Area (Player vs Opponent)
    const fightersGrid = document.createElement('div');
    fightersGrid.style.display = 'grid';
    fightersGrid.style.gridTemplateColumns = '1fr 1fr';
    fightersGrid.style.gap = '16px';
    fightersGrid.style.marginBottom = '14px';
    duelTable.append(fightersGrid);

    // Helper: Render Outlaw Status Card
    const renderFighterCard = (name: string, role: string, energy: number, intox: number, isPlayer: boolean) => {
      const card = document.createElement('div');
      card.style.background = '#1a100a';
      card.style.border = `1px solid ${isPlayer ? '#4ade80' : '#f87171'}`;
      card.style.borderRadius = '6px';
      card.style.padding = '12px';

      const title = document.createElement('div');
      title.style.display = 'flex';
      title.style.justifyContent = 'space-between';
      title.style.alignItems = 'center';
      title.style.marginBottom = '8px';
      card.append(title);

      text('strong', `${isPlayer ? '🤠' : '🧔'} ${name}`, title);
      const tag = text('small', role, title);
      tag.style.color = '#a89474';

      // Energy Progress Bar
      text('small', `Energie (Standfestigkeit): ${energy}/100`, card);
      const energyOuter = document.createElement('div');
      energyOuter.style.background = '#331a1a';
      energyOuter.style.height = '12px';
      energyOuter.style.borderRadius = '6px';
      energyOuter.style.overflow = 'hidden';
      energyOuter.style.margin = '4px 0 8px';

      const energyInner = document.createElement('div');
      energyInner.style.width = `${Math.max(0, energy)}%`;
      energyInner.style.height = '100%';
      energyInner.style.background = energy > 50 ? '#22c55e' : energy > 25 ? '#eab308' : '#ef4444';
      energyInner.style.transition = 'width 0.3s ease';
      energyOuter.append(energyInner);
      card.append(energyOuter);

      // Intoxication Gauge
      text('small', `Rauschpegel: ${intox}% ${intox >= 50 ? '🥴 (Taumelt!)' : intox >= 25 ? '🍺 (Angeschlagen)' : '🙂 (Nüchtern)'}`, card);
      const intoxOuter = document.createElement('div');
      intoxOuter.style.background = '#1e293b';
      intoxOuter.style.height = '8px';
      intoxOuter.style.borderRadius = '4px';
      intoxOuter.style.overflow = 'hidden';
      intoxOuter.style.margin = '4px 0 0';

      const intoxInner = document.createElement('div');
      intoxInner.style.width = `${Math.min(100, intox)}%`;
      intoxInner.style.height = '100%';
      intoxInner.style.background = '#a855f7';
      intoxInner.style.transition = 'width 0.3s ease';
      intoxOuter.append(intoxInner);
      card.append(intoxOuter);

      return card;
    };

    fightersGrid.append(
      renderFighterCard('Du (Herausforderer)', 'Outlaw', game.player.energy, game.player.intoxication, true),
      renderFighterCard(game.opponent.name, 'Saloon-Trinkmeister', game.opponent.energy, game.opponent.intoxication, false)
    );

    // Last Round Action & Feedback
    if (lastRoundResult) {
      const roundFeed = document.createElement('div');
      roundFeed.style.padding = '8px 12px';
      roundFeed.style.margin = '8px 0';
      roundFeed.style.borderRadius = '4px';
      roundFeed.style.background = '#24140b';
      roundFeed.style.border = '1px dashed #785233';
      roundFeed.style.fontSize = '14px';
      roundFeed.textContent = `Getränk: ${lastRoundResult.drinkName} · Dein Schluck: ${lastRoundResult.playerQte} | ${game.opponent.name}: ${lastRoundResult.oppQte}`;
      duelTable.append(roundFeed);
    }

    // Outcome Banner
    if (lastOutcomeMessage) {
      const outcomeBanner = document.createElement('div');
      outcomeBanner.style.padding = '12px 16px';
      outcomeBanner.style.margin = '10px 0';
      outcomeBanner.style.borderRadius = '6px';
      outcomeBanner.style.fontWeight = 'bold';
      outcomeBanner.style.fontSize = '15px';
      if (lastOutcomeMessage.includes('SIEG')) {
        outcomeBanner.style.background = '#1a3d24';
        outcomeBanner.style.border = '2px solid #4ade80';
        outcomeBanner.style.color = '#86efac';
      } else if (lastOutcomeMessage.includes('Unentschieden')) {
        outcomeBanner.style.background = '#2e2616';
        outcomeBanner.style.border = '2px solid #eab308';
        outcomeBanner.style.color = '#fde047';
      } else {
        outcomeBanner.style.background = '#3d1a1d';
        outcomeBanner.style.border = '2px solid #f87171';
        outcomeBanner.style.color = '#fca5a5';
      }
      outcomeBanner.textContent = lastOutcomeMessage;
      duelTable.append(outcomeBanner);
    }

    // Controls Section
    const controls = document.createElement('div');
    controls.style.margin = '14px 0';
    d.content.append(controls);

    if (!game.roundActive) {
      // Betting & Challenge Phase
      text('strong', '💰 Wähle deinen Wetteinsatz für das Tresen-Duell:', controls);
      const betRow = document.createElement('div');
      betRow.className = 'rdo-venue__categories';
      betRow.style.margin = '8px 0 14px';
      controls.append(betRow);

      const bets = [15, 30, 75, 150];
      for (const bet of bets) {
        const chipBtn = d.button(`${bet} Coins`, () => {
          selectedBet = bet;
          render();
        }, betRow);
        chipBtn.className = 'rdo-cinema__seat-btn';
        if (selectedBet === bet) chipBtn.classList.add('rdo-cinema__seat-btn--active');
      }

      const canAfford = walletBalance >= BigInt(selectedBet);
      const startBtn = d.button(
        canAfford ? `🍺 Duell fordern (${selectedBet} Coins)` : `Zu wenig Coins (${selectedBet})`,
        async () => {
          if (walletBalance < BigInt(selectedBet)) {
            d.status.textContent = 'Nicht genügend Coins.';
            return;
          }

          const reserved = await WalletService.reserveBet(selectedBet, 'wettsaufen-duel');
          if (!reserved) {
            d.status.textContent = 'Einsatz-Buchung fehlgeschlagen.';
            return;
          }

          activeWager = selectedBet;
          lastOutcomeMessage = undefined;
          lastRoundResult = undefined;
          game.startDuel(selectedBet);
          d.status.textContent = `${game.opponent.name} knallt seinen Maßkrug auf den Tresen! Wähle deinen nächsten Schluck.`;
          render();
        },
        controls
      );
      startBtn.disabled = !canAfford;
      startBtn.style.fontWeight = 'bold';
      startBtn.style.fontSize = '16px';
    } else {
      // Active Duel Round Controls
      text('strong', `Runde ${game.roundNumber}: Wähle das Getränk für diese Runde:`, controls);
      const drinkGrid = document.createElement('div');
      drinkGrid.style.display = 'grid';
      drinkGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(140px, 1fr))';
      drinkGrid.style.gap = '10px';
      drinkGrid.style.margin = '10px 0';
      controls.append(drinkGrid);

      const drinks: DrinkType[] = ['beer', 'whiskey', 'moonshine', 'mezcal'];
      for (const drinkKey of drinks) {
        const drinkCfg = DRINKS[drinkKey];
        const drinkBtn = d.button(
          `${drinkCfg.name} (-${drinkCfg.energyCost} E / +${drinkCfg.alcoholPct}%)`,
          async () => {
            // Determine player QTE quality (timing roll influenced by current intoxication)
            const intox = game.player.intoxication;
            const roll = Math.random() * 100;
            const failChance = 10 + intox * 0.45;
            const playerQte: 'perfect' | 'good' | 'miss' =
              roll < failChance ? 'miss' : roll < failChance + 50 ? 'good' : 'perfect';

            const result = game.executeRound(drinkKey, playerQte);

            lastRoundResult = {
              drinkName: drinkCfg.name,
              playerQte: playerQte === 'perfect' ? '⭐ Perfekter Zug!' : playerQte === 'good' ? '👍 Guter Schluck' : '💥 Verschluckt & gehustet!',
              oppQte: result.opponentResult.qte === 'perfect' ? '⭐ Perfekt' : result.opponentResult.qte === 'good' ? '👍 Sauber' : '💥 Gehustet'
            };

            if (result.winner) {
              lastOutcomeMessage = result.message;
              activeWager = 0;
              if (result.payout > 0) {
                await WalletService.settlePot(result.payout, 'wettsaufen-win');
              }
              d.status.textContent = result.message;
            } else {
              d.status.textContent = result.message;
            }

            render();
          },
          drinkGrid
        );
        drinkBtn.title = drinkCfg.flavour;
      }
    }

    // Leave Counter Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '20px';
    footer.style.borderTop = '1px solid #766443';
    footer.style.paddingTop = '12px';
    d.content.append(footer);

    d.button('Tresen verlassen', async () => {
      await refundActiveWager();
      d.close();
    }, footer);
  };

  return {
    get isOpen() {
      return Boolean(dialog?.isOpen);
    },
    open() {
      dialog = new VenueDialog(parent, 'Wettsaufen am Tresen · Saloon-Duell', () => {
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
