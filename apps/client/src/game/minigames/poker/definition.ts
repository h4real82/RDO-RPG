import { VenueDialog, text } from '../../venues/VenueDialog';
import { PokerPractice, parsePokerVariant, evaluateCurrentHand, formatCard, type PokerVariant } from './PokerRules';
import { WalletService, formatCoins } from '../../economy/WalletService';
import type { Venue } from '../types';

export function create(parent: HTMLElement, variant: unknown, _venue: Venue) {
  const baseConfig = parsePokerVariant(variant);
  let dialog: VenueDialog | undefined;
  let game: PokerPractice | undefined;

  let seated = false;
  let currentBuyIn = 200;
  let playerChips = 0;
  let opponentChips = 0;
  let activeVariant: PokerVariant = {
    ...baseConfig,
    startingChips: 200,
    smallBlind: 5,
    bigBlind: 10,
  };

  const cashOutRemaining = async () => {
    if (playerChips > 0) {
      const payout = playerChips;
      playerChips = 0;
      await WalletService.settlePot(payout, 'poker-cashout');
    }
  };

  const renderLobby = () => {
    if (!dialog) return;
    const d = dialog;
    d.content.replaceChildren();

    const walletBalance = WalletService.getSyncBalance();

    text('p', 'Willkommen am Pokertisch im Smithfield’s Saloon. Gespielt wird klassisches No-Limit Texas Hold’em gegen Saloon-Gambler Doc Holliday.', d.content);

    const walletBox = document.createElement('div');
    walletBox.className = 'rdo-poker__lobby-wallet';
    walletBox.style.cssText = 'padding: 12px 16px; margin: 12px 0; background: rgba(0,0,0,0.35); border: 1px solid #8c754c; border-radius: 4px;';
    walletBox.innerHTML = `<strong>Deine Geldbörse:</strong> <span style="color:#e5b259; font-size:1.15em;">💰 ${formatCoins(walletBalance)} Coins</span>`;
    d.content.append(walletBox);

    if (walletBalance < 20n) {
      d.status.textContent = 'Dein Guthaben reicht für die Mindesteinsätze am Pokertisch nicht aus (mindestens 20 Coins erforderlich). Verkaufe Vorräte bei der Valentine Bank.';
      d.button('Tisch verlassen', () => d.close());
      return;
    }

    text('h3', 'Wähle deinen Buy-In (Tischeinsatz):', d.content);
    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;';
    d.content.append(optionsContainer);

    const stakes = [
      { buyIn: 100, sb: 2, bb: 4, label: '100 Coins (Blinds 2/4)' },
      { buyIn: 200, sb: 5, bb: 10, label: '200 Coins (Blinds 5/10) · Standard' },
      { buyIn: 500, sb: 10, bb: 20, label: '500 Coins (Blinds 10/20) · High Roller' },
    ];

    for (const stake of stakes) {
      const available = walletBalance >= BigInt(stake.buyIn);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `${stake.label}${!available ? ' (Guthaben fehlt)' : ''}`;
      btn.disabled = !available;
      if (currentBuyIn === stake.buyIn && available) {
        btn.style.borderColor = '#e5b259';
        btn.style.background = '#663f30';
      }
      btn.addEventListener('click', () => {
        currentBuyIn = stake.buyIn;
        activeVariant = {
          ...baseConfig,
          startingChips: stake.buyIn,
          smallBlind: stake.sb,
          bigBlind: stake.bb,
        };
        renderLobby();
      });
      optionsContainer.append(btn);
    }

    d.button(`Am Tisch Platz nehmen (💰 ${currentBuyIn} Coins Buy-In)`, async () => {
      const reserved = await WalletService.reserveBet(currentBuyIn);
      if (!reserved) {
        d.status.textContent = 'Nicht genügend Coins in deiner Geldbörse.';
        renderLobby();
        return;
      }

      seated = true;
      playerChips = currentBuyIn;
      opponentChips = currentBuyIn;
      startNewHand();
    });

    d.status.textContent = 'Bereit für eine Runde Texas Hold’em.';
  };

  const startNewHand = () => {
    if (!dialog) return;
    if (playerChips <= 0) {
      renderTable();
      return;
    }

    if (opponentChips <= 0) {
      opponentChips = currentBuyIn;
    }

    game = new PokerPractice(undefined, activeVariant, [playerChips, opponentChips]);
    renderTable();
  };

  const renderTable = () => {
    if (!dialog || !game) return;
    const d = dialog;
    d.content.replaceChildren();

    // Table Header
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #766443; padding-bottom:8px; margin-bottom:12px;';
    headerRow.innerHTML = `<span><strong>Tisch:</strong> Blinds ${activeVariant.smallBlind}/${activeVariant.bigBlind} Coins</span>
      <span style="color:#e5b259;">💰 <strong>${formatCoins(game.stacks[0] + game.bets[0])}</strong> Stack</span>`;
    d.content.append(headerRow);

    // Opponent Area
    const oppBox = document.createElement('div');
    oppBox.style.cssText = 'background:rgba(0,0,0,0.25); padding:8px 12px; border-radius:4px; margin-bottom:12px; border-left:3px solid #8c754c;';
    oppBox.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>🤠 Doc Holliday</strong>
        <span style="color:#d4c4a8;">Doc's Chips: <strong>${formatCoins(game.stacks[1] + game.bets[1])}</strong></span>
      </div>`;
    d.content.append(oppBox);

    const renderCardRow = (cards: string[], isRevealed: boolean) => {
      const row = document.createElement('div');
      row.className = 'rdo-poker__cards';
      for (const card of cards) {
        const c = formatCard(isRevealed ? card : '??');
        const el = document.createElement('span');
        el.className = 'rdo-poker__card';
        el.dataset.red = String(c.red);
        el.setAttribute('aria-label', isRevealed ? card : 'Verdeckte Karte');
        el.textContent = c.text;
        row.append(el);
      }
      return row;
    };

    oppBox.append(renderCardRow(game.opponent, game.finished && game.street >= 4));

    // Center Felt: Community Cards & Pot
    const felt = document.createElement('div');
    felt.style.cssText = 'background:radial-gradient(ellipse at center, #1b3d2b 0%, #0d2217 100%); border:2px solid #8c754c; border-radius:8px; padding:12px; text-align:center; margin:12px 0; box-shadow:inset 0 0 20px #000;';

    const stageLabel = ['Vor dem Flop (Pre-Flop)', 'Flop', 'Turn', 'River', 'Showdown'][Math.min(game.street, 4)];
    const stageTitle = document.createElement('div');
    stageTitle.style.cssText = 'font-size:0.85em; text-transform:uppercase; letter-spacing:0.1em; color:#c6b78d; margin-bottom:6px;';
    stageTitle.textContent = stageLabel;
    felt.append(stageTitle);

    const visibleCommunityCount = game.street >= 4 ? 5 : [0, 3, 4, 5][game.street];
    const visibleCards = game.board.slice(0, visibleCommunityCount);
    const commCards = renderCardRow(
      visibleCards.length > 0 ? visibleCards : ['??', '??', '??'],
      visibleCards.length > 0
    );
    commCards.style.justifyContent = 'center';
    felt.append(commCards);

    const potBadge = document.createElement('div');
    potBadge.style.cssText = 'display:inline-block; margin-top:4px; padding:4px 16px; background:#141210; border:1px solid #e5b259; border-radius:20px; font-weight:bold; color:#fff8ec; font-size:1.1em; box-shadow:0 3px 10px rgba(0,0,0,0.5);';
    potBadge.innerHTML = `Pot: <span style="color:#e5b259;">💰 ${formatCoins(game.pot)} Coins</span>`;
    felt.append(potBadge);
    d.content.append(felt);

    // Player Area
    const playerBox = document.createElement('div');
    playerBox.style.cssText = 'background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:4px; margin-top:12px; border-left:3px solid #e5b259;';
    const handHint = evaluateCurrentHand(game.player, game.board.slice(0, visibleCommunityCount));
    playerBox.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>Deine Hand: <span style="color:#e5b259;">${handHint || '2 Handkarten'}</span></strong>
        <span>Deine Chips: <strong>${formatCoins(game.stacks[0])}</strong></span>
      </div>`;
    d.content.append(playerBox);
    playerBox.append(renderCardRow(game.player, true));

    // Actions & Betting
    const act = (action: 'fold' | 'call' | 'check' | 'raise', amount?: number) => {
      try {
        game!.act(action, amount);
        if (game!.finished) {
          playerChips = game!.stacks[0];
          opponentChips = game!.stacks[1];
        }
        renderTable();
      } catch (error) {
        d.status.textContent = (error as Error).message;
      }
    };

    if (game && !game.finished) {
      const canCall=game.toCall>0;
      d.button('Passen (Fold)', () => act('fold'));
      d.button(game.toCall ? `Mitgehen · ${formatCoins(game.toCall)} Coins` : 'Check', () =>
        act(canCall ? 'call' : 'check')
      );

      const maxRaise = game.stacks[0] + game.bets[0];
      const minRaise = Math.min(game.bets[1] + activeVariant.bigBlind, maxRaise);

      if (maxRaise > game.bets[1]) {
        const raiseInput = d.input(
          `Erhöhen auf (Coins dieser Runde, Min: ${minRaise})`,
          'number',
          String(minRaise)
        );
        raiseInput.min = String(minRaise);
        raiseInput.max = String(maxRaise);
        raiseInput.step = String(activeVariant.bigBlind);

        d.button('Erhöhen', () => act('raise', Number(raiseInput.value)));

        if (maxRaise > minRaise) {
          d.button(`All-In (💰 ${formatCoins(maxRaise)})`, () => act('raise', maxRaise));
        }
      }

      d.status.textContent = game.toCall > 0 ? `Doc Holliday verlangt ${formatCoins(game.toCall)} Coins zum Mitgehen.` : 'Du bist am Zug.';
    } else {
      // Hand finished
      d.status.textContent = game.result;

      if (playerChips > 0 && opponentChips > 0) {
        d.button('Nächste Hand geben', () => startNewHand());
      } else if (opponentChips <= 0) {
        d.status.textContent = `${game.result} Doc Holliday hat alle Chips verloren! Du hast den Tisch dominiert.`;
      } else {
        d.status.textContent = `${game.result} Dein Stack ist aufgebraucht.`;
        const walletBal = WalletService.getSyncBalance();
        if (walletBal >= BigInt(currentBuyIn)) {
          d.button(`Nachkaufen (${currentBuyIn} Coins Buy-In)`, async () => {
            const reserved = await WalletService.reserveBet(currentBuyIn);
            if (reserved) {
              playerChips = currentBuyIn;
              startNewHand();
            } else {
              d.status.textContent = 'Nicht genügend Coins in deiner Geldbörse.';
            }
          });
        }
      }

      d.button(`Tisch verlassen & auszahlen (💰 ${formatCoins(playerChips)} Coins)`, async () => {
        const cash = playerChips;
        await cashOutRemaining();
        seated = false;
        d.status.textContent = `Auszahlung verbucht: 💰 ${formatCoins(cash)} Coins wurden deiner Geldbörse gutgeschrieben!`;
        setTimeout(() => {
          if (dialog?.isOpen) d.close();
        }, 1200);
      });
    }
  };

  return {
    get isOpen() {
      return Boolean(dialog?.isOpen);
    },
    open() {
      dialog = new VenueDialog(parent, 'Poker am grünen Tisch', () => {
        // Safe refund on close if chips remaining
        void cashOutRemaining();
      });
      renderLobby();
    },
    dispose() {
      void cashOutRemaining();
      dialog?.close();
      dialog = undefined;
    },
  };
}
