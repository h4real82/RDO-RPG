import { VenueDialog, text } from '../venues/VenueDialog';
import { WalletService } from '../economy/WalletService';
import { ScreenEffects } from '../venues/ScreenEffects';

export interface TownNpcDialogCallbacks {
  onChanged?: () => void;
  onOpenShootingRange?: () => void;
  onOpenCemetery?: () => void;
}

export class TownNpcs {
  private activeDialog?: VenueDialog;

  constructor(
    private parent: HTMLElement,
    private callbacks: TownNpcDialogCallbacks = {}
  ) {}

  get isOpen(): boolean {
    return Boolean(this.activeDialog?.isOpen);
  }

  close(): void {
    try {
      this.activeDialog?.close();
      this.activeDialog = undefined;
    } catch (err) {
      console.error('[TownNpcs] Error closing dialog:', err);
    }
  }

  /**
   * Sheriff Curtis Malloy - Law & Order, Bounty Board, Weapon regulations
   */
  openSheriff(): VenueDialog {
    this.close();
    const d = new VenueDialog(this.parent, 'Sheriff Curtis Malloy · Büro & Arrestzellen');
    d.panel.dataset.venue = 'sheriff';
    this.activeDialog = d;

    const renderMain = () => {
      d.content.innerHTML = '';
      text('p', '„Willkommen in Valentine, Fremder. Ich bin Sheriff Curtis Malloy. Solange du keinen Ärger machst, deine Waffe im Halfter lässt und keine Kühe stiehlst, kommen wir bestens miteinander aus. Was führt dich zu mir?“', d.content);

      const menu = document.createElement('div');
      menu.style.display = 'flex';
      menu.style.flexDirection = 'column';
      menu.style.gap = '8px';
      menu.style.margin = '14px 0';

      // Option 1: Bounty Board
      const b1 = document.createElement('button');
      b1.className = 'rdo-dialog-btn rdo-dialog-btn--primary';
      b1.textContent = '📜 Steckbriefe & Kopfgelder ansehen';
      b1.addEventListener('click', () => {
        try { renderBountyBoard(); } catch (err) { console.error(err); }
      });
      menu.appendChild(b1);

      // Option 2: Town Law
      const b2 = document.createElement('button');
      b2.className = 'rdo-dialog-btn';
      b2.textContent = '⚖️ Gesetz & Waffenverbot in Valentine erfragen';
      b2.addEventListener('click', () => {
        try { renderLawInfo(); } catch (err) { console.error(err); }
      });
      menu.appendChild(b2);

      // Option 3: Leave
      const b3 = document.createElement('button');
      b3.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      b3.textContent = '„Schönen Tag noch, Sheriff.“ (Verlassen)';
      b3.addEventListener('click', () => this.close());
      menu.appendChild(b3);

      d.content.appendChild(menu);
    };

    const renderBountyBoard = () => {
      d.content.innerHTML = '';
      text('p', 'Sheriff Malloy deutet auf die von Einschusslöchern und Reißzwecken übersäte Korkwand hinter seinem Schreibtisch:', d.content);

      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '10px';
      list.style.margin = '12px 0';

      const bounties = [
        {
          name: '„One-Eye“ Jack Dalton',
          crime: 'Pferdediebstahl & Überfall auf den Cumberland-Postwagen',
          reward: 25,
          status: 'Flüchtig in den Grizzlies'
        },
        {
          name: 'Barnaby Finch',
          crime: 'Falschspiel & Schlägerei im Smithfields Saloon',
          reward: 15,
          status: 'Letzte Sichtung: Östliche Waldgrenze'
        }
      ];

      for (const b of bounties) {
        const card = document.createElement('div');
        card.style.background = 'rgba(212,175,55,0.08)';
        card.style.border = '1px solid rgba(212,175,55,0.25)';
        card.style.borderRadius = '4px';
        card.style.padding = '10px 14px';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#ebdcb9; font-size:14px;">WANTED: ${b.name}</b>
            <span style="color:#ffd700; font-weight:bold; font-size:13px;">💰 ${b.reward} Coins</span>
          </div>
          <div style="color:#a89f91; font-size:12px; margin-top:4px;">Verbrechen: ${b.crime}</div>
          <div style="color:#786f61; font-size:11px; margin-top:2px;">Status: ${b.status}</div>
        `;
        list.appendChild(card);
      }

      d.content.appendChild(list);

      const back = document.createElement('button');
      back.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      back.textContent = '← Zurück zu Sheriff Malloy';
      back.addEventListener('click', () => {
        try { renderMain(); } catch (err) { console.error(err); }
      });
      d.content.appendChild(back);
    };

    const renderLawInfo = () => {
      d.content.innerHTML = '';
      text('p', 'Sheriff Malloy rückt seinen Stern zurecht und blickt dich ernst an: „Valentine ist eine aufstrebende Handelsstadt. Wir dulden keine Gesetzlosen, die auf offener Straße um sich schießen. Wenn du deine Waffe ziehst und Unruhe stiftest, landest du schneller in meiner Zelle, als du nachladen kannst. Willst du schießen üben, geh zum Schießstand hinter dem Büchsenmacher.“', d.content);

      const back = document.createElement('button');
      back.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      back.textContent = '← Verstanden, Sheriff';
      back.addEventListener('click', () => {
        try { renderMain(); } catch (err) { console.error(err); }
      });
      d.content.appendChild(back);
    };

    renderMain();
    return d;
  }

  /**
   * Reverend Swanson - Chapel, Confession, Cemetery history & blessing
   */
  openReverend(): VenueDialog {
    this.close();
    const d = new VenueDialog(this.parent, 'Reverend Swanson · Kirche von Valentine');
    d.panel.dataset.venue = 'reverend';
    this.activeDialog = d;

    const renderMain = () => {
      d.content.innerHTML = '';
      text('p', '„Der Herr sei mit dir, verlorenes Schaf. Die Sorgen der Welt wiegen schwer auf den staubigen Straßen von Valentine, doch in diesem Gotteshaus findest du Ruhe und Einkehr. Wie kann ich dir helfen?“', d.content);

      const menu = document.createElement('div');
      menu.style.display = 'flex';
      menu.style.flexDirection = 'column';
      menu.style.gap = '8px';
      menu.style.margin = '14px 0';

      // Blessing
      const b1 = document.createElement('button');
      b1.className = 'rdo-dialog-btn rdo-dialog-btn--primary';
      b1.textContent = '✨ Um geistlichen Segen & Erholung bitten';
      b1.addEventListener('click', () => {
        try {
          ScreenEffects.applyInvincibleEffect(30000);
          d.content.innerHTML = '';
          text('p', 'Reverend Swanson legt dir sanft die Hand auf die Schulter und murmelt ein altes Bibelgebet aus dem Buch der Psalmen. Ein wohliges, warmes Gefühl durchströmt dich. Vitalität & Geist sind erneuert!', d.content);
          const back = document.createElement('button');
          back.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
          back.textContent = 'Amen (Zurück)';
          back.addEventListener('click', () => renderMain());
          d.content.appendChild(back);
        } catch (err) { console.error(err); }
      });
      menu.appendChild(b1);

      // Cemetery guidance
      const b2 = document.createElement('button');
      b2.className = 'rdo-dialog-btn';
      b2.textContent = '🪦 Über den Friedhof und die Grabstätten sprechen';
      b2.addEventListener('click', () => {
        try {
          if (this.callbacks.onOpenCemetery) {
            this.callbacks.onOpenCemetery();
          } else {
            renderCemeteryLore();
          }
        } catch (err) { console.error(err); }
      });
      menu.appendChild(b2);

      // Leave
      const b3 = document.createElement('button');
      b3.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      b3.textContent = '„Auf Wiedersehen, Reverend.“ (Verlassen)';
      b3.addEventListener('click', () => this.close());
      menu.appendChild(b3);

      d.content.appendChild(menu);
    };

    const renderCemeteryLore = () => {
      d.content.innerHTML = '';
      text('p', 'Der Reverend blickt versonnen durch das Kirchenfenster hinüber zum Friedhof: „Dort draußen ruhen viele Pioniere, Farmer und Gesetzlose. Manche Grabsteine erzählen von großem Mut, andere von den harten Gefahren der Grenze. Du kannst jederzeit hinausgehen und ihre Inschriften studieren.“', d.content);
      const back = document.createElement('button');
      back.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      back.textContent = '← Zurück zum Altar';
      back.addEventListener('click', () => {
        try { renderMain(); } catch (err) { console.error(err); }
      });
      d.content.appendChild(back);
    };

    renderMain();
    return d;
  }

  /**
   * Dr. Barnes - Town Doctor, Health Healing & Medical Tonics
   */
  openDoctor(): VenueDialog {
    this.close();
    const d = new VenueDialog(this.parent, 'Dr. Barnes · Arztpraxis & Apotheke');
    d.panel.dataset.venue = 'doctor';
    this.activeDialog = d;

    const renderMain = () => {
      d.content.innerHTML = '';
      text('p', 'Dr. Barnes wäscht sich die Hände über einer Porzellanschüssel und dreht sich um: „Guten Tag. Du siehst etwas mitgenommen aus vom Ritt über die schlammigen Straßen. Brauchst du eine Wundversorgung oder etwas aus meiner Apothekerauswahl?“', d.content);

      const balance = WalletService.getSyncBalance();
      const balEl = document.createElement('div');
      balEl.style.fontSize = '12px';
      balEl.style.color = '#ffd700';
      balEl.style.margin = '4px 0 12px 0';
      balEl.textContent = `Dein Münzbeutel: ${balance} Coins`;
      d.content.appendChild(balEl);

      const menu = document.createElement('div');
      menu.style.display = 'flex';
      menu.style.flexDirection = 'column';
      menu.style.gap = '8px';

      // Heal
      const b1 = document.createElement('button');
      b1.className = 'rdo-dialog-btn rdo-dialog-btn--primary';
      b1.textContent = '🩹 Wundbehandlung & Pflaster (5 Coins)';
      b1.addEventListener('click', async () => {
        try {
          if (WalletService.getSyncBalance() < 5n) {
            alert('Nicht genügend Coins für eine Behandlung!');
            return;
          }
          const ok = await WalletService.reserveBet(5, 'doctor-heal');
          if (!ok) return;
          this.callbacks.onChanged?.();
          ScreenEffects.applyInvincibleEffect(30000);
          d.content.innerHTML = '';
          text('p', 'Dr. Barnes reinigt gekonnt deine Schrammen und legt einen festen Verband an. Deine Vitalität ist wieder bei 100%!', d.content);
          const back = document.createElement('button');
          back.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
          back.textContent = 'Danke, Doktor (Zurück)';
          back.addEventListener('click', () => renderMain());
          d.content.appendChild(back);
        } catch (err) { console.error(err); }
      });
      menu.appendChild(b1);

      // Buy Snake Oil / Patent Medicine
      const b2 = document.createElement('button');
      b2.className = 'rdo-dialog-btn';
      b2.textContent = '🧪 Wundertinktur / Snake Oil kaufen (8 Coins)';
      b2.addEventListener('click', async () => {
        try {
          if (WalletService.getSyncBalance() < 8n) {
            alert('Nicht genügend Coins!');
            return;
          }
          const ok = await WalletService.reserveBet(8, 'doctor-snake-oil');
          if (!ok) return;
          this.callbacks.onChanged?.();
          ScreenEffects.applyInvincibleEffect(60000);
          d.content.innerHTML = '';
          text('p', 'Du erhältst eine Flasche feinstes patentiertes Schlangenöl in bernsteinfarbenem Glas. Belebt Körper und Konzentration!', d.content);
          const back = document.createElement('button');
          back.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
          back.textContent = 'Weiter (Zurück)';
          back.addEventListener('click', () => renderMain());
          d.content.appendChild(back);
        } catch (err) { console.error(err); }
      });
      menu.appendChild(b2);

      // Leave
      const b3 = document.createElement('button');
      b3.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      b3.textContent = '„Mir fehlt nichts, danke.“ (Verlassen)';
      b3.addEventListener('click', () => this.close());
      menu.appendChild(b3);

      d.content.appendChild(menu);
    };

    renderMain();
    return d;
  }

  /**
   * Gunsmith Arthur - Firearms, Ammunition & Shooting Range
   */
  openGunsmith(): VenueDialog {
    this.close();
    const d = new VenueDialog(this.parent, 'Arthur Gunsmith · Büchsenmacher Valentine');
    d.panel.dataset.venue = 'gunsmith';
    this.activeDialog = d;

    const renderMain = () => {
      d.content.innerHTML = '';
      text('p', 'Büchsenmacher Arthur wischt mit einem öligen Lappen über den polierten Holzschaft einer Winchester 1873: „Willkommen im besten Waffenladen von New Hanover. Ich führe Colts, Repetierer und Flinten in erstklassigem Zustand. Brauchst du Munition oder willst du deine Treffsicherheit am Schießstand testen?“', d.content);

      const balance = WalletService.getSyncBalance();
      const balEl = document.createElement('div');
      balEl.style.fontSize = '12px';
      balEl.style.color = '#ffd700';
      balEl.style.margin = '4px 0 12px 0';
      balEl.textContent = `Dein Münzbeutel: ${balance} Coins`;
      d.content.appendChild(balEl);

      const menu = document.createElement('div');
      menu.style.display = 'flex';
      menu.style.flexDirection = 'column';
      menu.style.gap = '8px';

      // Shooting Range
      const b1 = document.createElement('button');
      b1.className = 'rdo-dialog-btn rdo-dialog-btn--primary';
      b1.textContent = '🎯 Zum Schießstand (Zielschießen auf Flaschen & Scheiben)';
      b1.addEventListener('click', () => {
        try {
          if (this.callbacks.onOpenShootingRange) {
            this.callbacks.onOpenShootingRange();
          } else {
            alert('Schießstand öffnet …');
          }
        } catch (err) { console.error(err); }
      });
      menu.appendChild(b1);

      // Buy Ammo
      const b2 = document.createElement('button');
      b2.className = 'rdo-dialog-btn';
      b2.textContent = '📦 Revolver-Munition nachfüllen (4 Coins)';
      b2.addEventListener('click', async () => {
        try {
          if (WalletService.getSyncBalance() < 4n) {
            alert('Nicht genügend Coins!');
            return;
          }
          const ok = await WalletService.reserveBet(4, 'gunsmith-ammo');
          if (!ok) return;
          this.callbacks.onChanged?.();
          d.content.innerHTML = '';
          text('p', 'Arthur greift unter die Theke und überreicht dir eine Pappschachtel mit 1873er .45 Colt Bleigeschossen. Dein Revolvergürtel ist voll aufmunitioniert!', d.content);
          const back = document.createElement('button');
          back.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
          back.textContent = 'Wunderbar (Zurück)';
          back.addEventListener('click', () => renderMain());
          d.content.appendChild(back);
        } catch (err) { console.error(err); }
      });
      menu.appendChild(b2);

      // Weapon Catalog inspection
      const b3 = document.createElement('button');
      b3.className = 'rdo-dialog-btn';
      b3.textContent = '📖 Waffen-Katalog durchblättern (Cattleman, Schofield, Winchester)';
      b3.addEventListener('click', () => {
        try { renderCatalog(); } catch (err) { console.error(err); }
      });
      menu.appendChild(b3);

      // Leave
      const b4 = document.createElement('button');
      b4.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      b4.textContent = '„Ich schau mich nur um.“ (Verlassen)';
      b4.addEventListener('click', () => this.close());
      menu.appendChild(b4);

      d.content.appendChild(menu);
    };

    const renderCatalog = () => {
      d.content.innerHTML = '';
      text('p', 'Arthur legt den illustrierten 1899er Handelskatalog auf die Theke:', d.content);

      const weapons = [
        { name: 'Cattleman Revolver', desc: 'Colt Single Action Army 1873 · 4.75" Lauf · Blauer Stahl & Walnussholz', price: 50 },
        { name: 'Schofield Revolver', desc: 'Smith & Wesson No. 3 Top-Break · Vernickelt mit Perlmuttgriff', price: 75 },
        { name: 'Winchester Repetierer 1873', desc: 'Unterhebelrepetierer · Messinggehäuse & 14-Schuss Röhrenmagazin', price: 120 }
      ];

      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '8px';
      list.style.margin = '10px 0';

      for (const w of weapons) {
        const item = document.createElement('div');
        item.style.background = 'rgba(212,175,55,0.08)';
        item.style.border = '1px solid rgba(212,175,55,0.2)';
        item.style.borderRadius = '4px';
        item.style.padding = '8px 12px';
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between;">
            <b style="color:#ebdcb9;">${w.name}</b>
            <span style="color:#ffd700; font-weight:bold;">${w.price} Coins</span>
          </div>
          <div style="font-size:11px; color:#a89f91; margin-top:2px;">${w.desc}</div>
        `;
        list.appendChild(item);
      }

      d.content.appendChild(list);

      const back = document.createElement('button');
      back.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      back.textContent = '← Zurück zu Arthur';
      back.addEventListener('click', () => renderMain());
      d.content.appendChild(back);
    };

    renderMain();
    return d;
  }
}
