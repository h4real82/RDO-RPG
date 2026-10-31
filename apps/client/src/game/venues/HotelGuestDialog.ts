import { VenueDialog, text } from './VenueDialog';
import { WalletService, formatCoins } from '../economy/WalletService';
import { ScreenEffects } from './ScreenEffects';
import './Venues.css';

export interface HotelGuestDialogCallbacks {
  onChanged?: () => void;
  onMinigame?: (gameId: string, variantId?: string) => void;
  onWettsaufen?: () => void;
  onClose?: () => void;
}

export class HotelGuestDialog {
  private dialog?: VenueDialog;
  private robberyExecuted = false;

  constructor(
    private readonly parent: HTMLElement,
    private readonly callbacks: HotelGuestDialogCallbacks = {}
  ) {}

  get isOpen(): boolean {
    return Boolean(this.dialog?.isOpen);
  }

  close(): void {
    try {
      this.dialog?.close();
      this.dialog = undefined;
    } catch (err) {
      console.error('[HotelGuestDialog] Error closing dialog:', err);
    }
  }

  open(parent = this.parent): VenueDialog {
    this.close();
    const d = (this.dialog = new VenueDialog(parent, 'Hotel-Gast', () => {
      this.callbacks.onClose?.();
    }));
    d.panel.dataset.venue = 'hotel_guest';
    this.renderMain(d);
    return d;
  }

  // --- Step 1: Main Greeting ---
  private renderMain(d: VenueDialog): void {
    d.content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    box.innerHTML = `
      <p style="margin:0 0 8px 0; font-size:17px; color:#f3ebda;">
        „Guten Tag, Herr. Die Reise mit der Postkutsche über die zerfurchten Straßen nach Valentine war überaus ermüdend, aber dieses Hotel hat eine wunderbare Wärme. Soll ich mit Ihnen aufs Zimmer gehen und Sie aufwärmen?“
      </p>
      <small style="color:#c6b78d;">Die Dame lächelt charmant und wartet auf Ihre Reaktion.</small>
    `;
    d.content.append(box);

    const options = document.createElement('div');
    options.className = 'rdo-guest-dialog__options';

    // Option 1: Zimmer
    const btnRoom = document.createElement('button');
    btnRoom.type = 'button';
    btnRoom.className = 'rdo-guest-dialog__btn';
    btnRoom.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">🛏️</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Ja gerne, gehen wir auf ein Zimmer!“</span>
        <span class="rdo-guest-dialog__btn-sub">Begleitung ins Deluxe-Zimmer im Obergeschoss</span>
      </div>
    `;
    btnRoom.addEventListener('click', () => this.renderRoomProposal(d));
    options.append(btnRoom);

    // Option 2: Andere Pläne
    const btnOther = document.createElement('button');
    btnOther.type = 'button';
    btnOther.className = 'rdo-guest-dialog__btn';
    btnOther.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">💬</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Nein, ich brauche dich für etwas anderes.“</span>
        <span class="rdo-guest-dialog__btn-sub">Überfall, Minispiele, Wettsaufen oder Schwarzmarkt-Tonika</span>
      </div>
    `;
    btnOther.addEventListener('click', () => this.renderOtherOptions(d));
    options.append(btnOther);

    // Option 3: Beleidigung / Abbruch
    const btnInsult = document.createElement('button');
    btnInsult.type = 'button';
    btnInsult.className = 'rdo-guest-dialog__btn';
    btnInsult.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">🛑</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Halt die Klappe!“</span>
        <span class="rdo-guest-dialog__btn-sub">Gespräch unfreundlich beenden</span>
      </div>
    `;
    btnInsult.addEventListener('click', () => this.renderInsulted(d));
    options.append(btnInsult);

    d.content.append(options);
  }

  // --- Step 2: Room Proposal & Deluxe Rest ---
  private renderRoomProposal(d: VenueDialog): void {
    d.content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    const balance = WalletService.getSyncBalance();
    box.innerHTML = `
      <p style="margin:0 0 8px 0; font-size:16px; color:#f3ebda;">
        „Sehr gerne, Cowboy. Nehmen wir das Deluxe-Zimmer im 1. Obergeschoss. Das Bett ist weich und der Kamin brennt warm. Für ein kleines Entgelt von <b>10 Coins</b> sorge ich dafür, dass Sie neue Kräfte schöpfen und alle Reisestrapazen vergessen.“
      </p>
      <div style="margin-top:8px; font-size:13px; color:#e4bd67;">
        Ihr Beutel: <b>${formatCoins(balance)}</b>
      </div>
    `;
    d.content.append(box);

    const options = document.createElement('div');
    options.className = 'rdo-guest-dialog__options';

    const btnRest = document.createElement('button');
    btnRest.type = 'button';
    btnRest.className = 'rdo-guest-dialog__btn';
    btnRest.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">🪙</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Ins Bett steigen & erholen (10 Coins)“</span>
        <span class="rdo-guest-dialog__btn-sub">Vollständige Erholung mit diskreter Zensurblende</span>
      </div>
    `;
    btnRest.addEventListener('click', () => this.executeRoomRest(d));
    options.append(btnRest);

    const btnBack = document.createElement('button');
    btnBack.type = 'button';
    btnBack.className = 'rdo-guest-dialog__btn';
    btnBack.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">↩️</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Doch lieber unten bleiben.“</span>
        <span class="rdo-guest-dialog__btn-sub">Zurück zur Hauptauswahl</span>
      </div>
    `;
    btnBack.addEventListener('click', () => this.renderMain(d));
    options.append(btnBack);

    d.content.append(options);
  }

  private async executeRoomRest(d: VenueDialog): Promise<void> {
    const cost = 10;
    const balance = WalletService.getSyncBalance();
    if (balance < BigInt(cost)) {
      d.status.textContent = 'Nicht genügend Coins im Beutel (10 benötigt).';
      return;
    }

    const reserved = await WalletService.reserveBet(cost, 'hotel-deluxe-room');
    if (!reserved) {
      d.status.textContent = 'Transaktion fehlgeschlagen.';
      return;
    }

    this.callbacks.onChanged?.();

    // Trigger discretion censorship mosaic overlay
    await ScreenEffects.applyCensorshipPixelEffect(2600);

    // After censorship returns, display completed narrative
    d.content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    box.innerHTML = `
      <p style="margin:0 0 10px 0; font-size:16px; color:#f3ebda;">
        <b>✨ Vollständig erholt & regeneriert!</b><br>
        Das war eine willkommene Auszeit! Sie werfen der Dame das versprochene Trinkgeld aufs Bett. Ihre Vitalität und Ausdauer sind zu 100% wiederhergestellt.
      </p>
      <p style="margin:0; font-size:14px; color:#c6b78d;">
        Die Dame lächelt entspannt aus dem Kissen: <i>„Ruhen Sie sich noch einen Moment aus, Cowboy. Ich bleibe noch kurz liegen und komme gleich wieder hinunter in die Lobby.“</i>
      </p>
    `;
    d.content.append(box);

    const btnLeave = d.button('Aufstehen & erfrischt weitergehen', () => {
      d.close();
    });
    btnLeave.className = 'rdo-venue__order-btn';
  }

  // --- Step 3: Other Options Submenu ---
  private renderOtherOptions(d: VenueDialog): void {
    d.content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    box.innerHTML = `
      <p style="margin:0 0 6px 0; font-size:16px; color:#f3ebda;">
        „Mach mich nicht so neugierig, erzähl! Wobei kann eine geschäftstüchtige Dame wie ich dir behilflich sein?“
      </p>
      <small style="color:#c6b78d;">Wählen Sie eine der Aktionen:</small>
    `;
    d.content.append(box);

    const options = document.createElement('div');
    options.className = 'rdo-guest-dialog__options';

    // 2.1 Heist
    const btnHeist = document.createElement('button');
    btnHeist.type = 'button';
    btnHeist.className = 'rdo-guest-dialog__btn';
    btnHeist.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">💰</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Hilf mir das Hotel zu überfallen!“</span>
        <span class="rdo-guest-dialog__btn-sub">Geldkassette der Rezeption erbeuten (+50 Coins)</span>
      </div>
    `;
    btnHeist.addEventListener('click', () => this.executeRobbery(d));
    options.append(btnHeist);

    // 2.2 Minigames Guide
    const btnGames = document.createElement('button');
    btnGames.type = 'button';
    btnGames.className = 'rdo-guest-dialog__btn';
    btnGames.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">🎲</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Ich will spielen, zeig mir wo ich hin muss!“</span>
        <span class="rdo-guest-dialog__btn-sub">Lotse zu Poker, Blackjack, Darts & Pferderennen</span>
      </div>
    `;
    btnGames.addEventListener('click', () => this.renderMinigamesGuide(d));
    options.append(btnGames);

    // 2.3 Wettsaufen
    const btnDrink = document.createElement('button');
    btnDrink.type = 'button';
    btnDrink.className = 'rdo-guest-dialog__btn';
    btnDrink.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">🍺</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Bock was zu saufen Süße?“</span>
        <span class="rdo-guest-dialog__btn-sub">Herausforderung zum Wettsaufen im Smithfields Saloon</span>
      </div>
    `;
    btnDrink.addEventListener('click', () => this.renderSaloonDrinking(d));
    options.append(btnDrink);

    // 2.4 Tonics & Remedies Shop
    const btnTonics = document.createElement('button');
    btnTonics.type = 'button';
    btnTonics.className = 'rdo-guest-dialog__btn';
    btnTonics.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">🧪</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Hast du was zu verkaufen?“</span>
        <span class="rdo-guest-dialog__btn-sub">Schwarzmarkt-Tonika, Schlangenschnaps & Wüstenkräuter</span>
      </div>
    `;
    btnTonics.addEventListener('click', () => this.renderTonicShop(d));
    options.append(btnTonics);

    // Back
    const btnBack = document.createElement('button');
    btnBack.type = 'button';
    btnBack.className = 'rdo-guest-dialog__btn';
    btnBack.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">↩️</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Zurück zum Hauptgespräch“</span>
      </div>
    `;
    btnBack.addEventListener('click', () => this.renderMain(d));
    options.append(btnBack);

    d.content.append(options);
  }

  // --- Step 2.1: Hotel Robbery ---
  private async executeRobbery(d: VenueDialog): Promise<void> {
    d.content.replaceChildren();

    if (this.robberyExecuted) {
      const box = document.createElement('div');
      box.className = 'rdo-guest-dialog__box';
      box.innerHTML = `
        <p style="margin:0; color:#e4bd67;">
          „Die Kasse ist bereits leergeräumt, Cowboy! Der Rezeptionist hat die Hände immer noch oben. Wenn wir hier noch länger herumstehen, knallt es gleich!“
        </p>
      `;
      d.content.append(box);
      const btnLeave = d.button('Lieber schnell verschwinden', () => d.close());
      btnLeave.className = 'rdo-venue__order-btn';
      return;
    }

    this.robberyExecuted = true;
    const loot = 50;
    await WalletService.settlePot(loot, 'hotel-reception-heist');
    this.callbacks.onChanged?.();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    box.innerHTML = `
      <p style="margin:0 0 10px 0; font-size:16px; color:#f3ebda;">
        <b>💥 Revolver gezogen! Hotel-Überfall erfolgreich!</b><br>
        Die Dame grinst verwegen, greift unter ihr Kleid und zieht einen kleinen Taschenrevolver hervor! Sie zielt auf den zitternden Hotel-Angestellten:
      </p>
      <blockquote style="margin:10px 0; padding:8px 14px; background:#241611; border-left:3px solid #ff4d4d; color:#ebd8ba;">
        <i>„Hände auf die Theke, Bursche! Keinen Ton, sonst pfeift dir Blei um die Ohren!“</i>
      </blockquote>
      <p style="margin:0; font-size:14px; color:#70d470;">
        <b>+${loot} Coins erbeutet!</b> Die Kasse ist geleert. Zeit, die Beine in die Hand zu nehmen, bevor der Sheriff eintrifft!
      </p>
    `;
    d.content.append(box);

    const btnLeave = d.button('Beute einstecken & abhauen!', () => d.close());
    btnLeave.className = 'rdo-venue__order-btn';
  }

  // --- Step 2.2: Minigames Guide ---
  private renderMinigamesGuide(d: VenueDialog): void {
    d.content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    box.innerHTML = `
      <p style="margin:0 0 8px 0; font-size:16px; color:#f3ebda;">
        „Valentine hat reichlich Zerstreuung für einen echten Cowboy. Hier findest du die besten Spiele im Ort:“
      </p>
      <ul style="margin:8px 0 0 18px; padding:0; font-size:14px; color:#c6b78d; line-height:1.6;">
        <li>🃏 <b>Texas Hold'em Poker</b>: Smithfields Saloon (großer Rundtisch mit grünem Filz)</li>
        <li>♠️ <b>Blackjack (17 und 4)</b>: Smithfields Saloon (Halbkreistisch am Fenster)</li>
        <li>🎯 <b>Saloon-Darts (301)</b>: Smithfields Saloon (Südwand, geöffnete Flügeltüren)</li>
        <li>🍺 <b>Wettsaufen</b>: Smithfields Saloon (direkt an der Bartheke)</li>
        <li>🐎 <b>Pferderennen</b>: Valentine Livery-Stall am Ortsrand</li>
        <li>🏹 <b>Bogenschießen</b>: Übungswiese hinter der Kirche</li>
        <li>🎥 <b>Wanderkino</b>: Magic-Lantern-Zelt am Westrand</li>
      </ul>
    `;
    d.content.append(box);

    const btnBack = d.button('Verstanden, danke für den Tipp!', () => this.renderOtherOptions(d));
    btnBack.className = 'rdo-venue__order-btn';
  }

  // --- Step 2.3: Saloon Drinking Challenge ---
  private renderSaloonDrinking(d: VenueDialog): void {
    d.content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    box.innerHTML = `
      <p style="margin:0 0 10px 0; font-size:16px; color:#f3ebda;">
        Die Dame lacht herzlich: <i>„Immer doch, Cowboy! Glaub ja nicht, dass du mich unter den Tisch trinken kannst. Ich habe schon ganz andere Holzfäller und Deputys auf allen Vieren aus dem Smithfield’s kriechen sehen!“</i>
      </p>
      <small style="color:#c6b78d;">Lust auf ein direktes Duell am Tresen?</small>
    `;
    d.content.append(box);

    const options = document.createElement('div');
    options.className = 'rdo-guest-dialog__options';

    const btnGo = document.createElement('button');
    btnGo.type = 'button';
    btnGo.className = 'rdo-guest-dialog__btn';
    btnGo.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">🍻</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Auf zum Saloon – die erste Runde geht auf mich!“</span>
        <span class="rdo-guest-dialog__btn-sub">Herausforderung im Wettsaufen annehmen</span>
      </div>
    `;
    btnGo.addEventListener('click', () => {
      d.close();
      this.callbacks.onWettsaufen?.();
    });
    options.append(btnGo);

    const btnBack = document.createElement('button');
    btnBack.type = 'button';
    btnBack.className = 'rdo-guest-dialog__btn';
    btnBack.innerHTML = `
      <span class="rdo-guest-dialog__btn-icon">↩️</span>
      <div>
        <span class="rdo-guest-dialog__btn-text">„Vielleicht doch erst später.“</span>
      </div>
    `;
    btnBack.addEventListener('click', () => this.renderOtherOptions(d));
    options.append(btnBack);

    d.content.append(options);
  }

  // --- Step 2.4: Tonics & Remedies Shop ---
  private renderTonicShop(d: VenueDialog): void {
    d.content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    const balance = WalletService.getSyncBalance();
    box.innerHTML = `
      <p style="margin:0 0 6px 0; font-size:16px; color:#f3ebda;">
        „Klar Cowboy, ich habe ein paar besondere Mixturen und Kräuter dabei. Welche Wirkung suchst du?“
      </p>
      <div style="font-size:13px; color:#e4bd67;">
        Ihr Beutel: <b>${formatCoins(balance)}</b>
      </div>
    `;
    d.content.append(box);

    const grid = document.createElement('div');
    grid.className = 'rdo-guest-dialog__tonic-grid';

    // 1. Wundertinktur (Invincible/Stamina)
    this.addTonicCard(grid, d, {
      title: '⚡ Wundertinktur der Witwe',
      price: 15,
      desc: 'Macht dich 5 Minuten unbändig stark und widerstandsfähig.',
      effectFn: () => ScreenEffects.applyInvincibleEffect(300000)
    });

    // 2. Schlangenschnaps (Drunk/Blur)
    this.addTonicCard(grid, d, {
      title: '🐍 Starker Schlangenschnaps',
      price: 10,
      desc: '5 Minuten berauschende Wirkung – Sicht verschwimmt und schwankt.',
      effectFn: () => ScreenEffects.applyDrunkEffect(300000)
    });

    // 3. Wüstenkraut (Slow/Relaxed)
    this.addTonicCard(grid, d, {
      title: '🌿 Guanaco-Wüstenkraut',
      price: 8,
      desc: '5 Minuten tiefe Gemütlichkeit – lässiger, langsamer Schlenderschritt.',
      effectFn: () => ScreenEffects.applySlowEffect(300000)
    });

    // 4. Peyote-Kaktus (Psychedelic)
    this.addTonicCard(grid, d, {
      title: '🍄 Peyote-Traumkaktus',
      price: 20,
      desc: '5 Minuten psychedelischer Farbenrausch – lebendige Lichterscheinungen.',
      effectFn: () => ScreenEffects.applyPsychedelicEffect(300000)
    });

    d.content.append(grid);

    const btnBack = d.button('Zurück zur Auswahl', () => this.renderOtherOptions(d));
    btnBack.className = 'rdo-venue__order-btn';
  }

  private addTonicCard(
    parent: HTMLElement,
    d: VenueDialog,
    tonic: { title: string; price: number; desc: string; effectFn: () => void }
  ): void {
    const card = document.createElement('div');
    card.className = 'rdo-guest-dialog__tonic-card';
    card.innerHTML = `
      <b style="color:#f3ebda; font-size:15px;">${tonic.title}</b>
      <div style="font-size:12px; color:#c6b78d;">${tonic.desc}</div>
      <div style="font-weight:bold; color:#e4bd67; font-size:13px; margin-top:auto;">Preis: ${tonic.price} Coins</div>
    `;

    const btnBuy = document.createElement('button');
    btnBuy.type = 'button';
    btnBuy.textContent = `Kaufen (${tonic.price} Coins)`;
    btnBuy.addEventListener('click', async () => {
      const balance = WalletService.getSyncBalance();
      if (balance < BigInt(tonic.price)) {
        d.status.textContent = `Nicht genügend Coins (${tonic.price} benötigt).`;
        return;
      }
      const ok = await WalletService.reserveBet(tonic.price, 'tonic-purchase');
      if (ok) {
        this.callbacks.onChanged?.();
        tonic.effectFn();
        d.status.textContent = `${tonic.title} eingenommen! Wirkung ist aktiv.`;
        this.renderTonicShop(d);
      }
    });

    card.append(btnBuy);
    parent.append(card);
  }

  // --- Step 4: Insult Reaction ---
  private renderInsulted(d: VenueDialog): void {
    d.content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'rdo-guest-dialog__box';
    box.style.borderLeftColor = '#ff4d4d';
    box.innerHTML = `
      <p style="margin:0 0 8px 0; font-size:16px; color:#f3ebda;">
        Die Dame funkelt dich zornig an, verschränkt die Arme und dreht sich brüsk weg:
      </p>
      <blockquote style="margin:8px 0; padding:8px 12px; background:#241414; border-left:3px solid #ff4d4d; color:#eed2cc;">
        <i>„Na hören Sie mal! Einen derart ungehobelten Klotz habe ich in ganz New Hanover noch nicht erlebt. Verschwinden Sie aus meinen Augen und sparen Sie sich Ihre Manieren für die Schweine am Auction Yard!“</i>
      </blockquote>
      <small style="color:#e4a0a0;">Die Interaktion ist beendet. Die Dame ist beleidigt und beachtet Sie nicht mehr.</small>
    `;
    d.content.append(box);

    const btnClose = d.button('Gespräch beenden', () => d.close());
    btnClose.className = 'rdo-venue__order-btn';
  }
}
