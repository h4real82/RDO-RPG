import { POIDefinition } from '@nes-rdo/shared';

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'consumable' | 'loot';
  icon: string;
  qty: number;
  desc: string;
  actionText: string;
}

export const sampleInventory: InventoryItem[] = [
  {
    id: 'cattleman',
    name: 'Cattleman Revolver',
    type: 'weapon',
    icon: '🔫',
    qty: 1,
    desc: 'Klassischer sechsschüssiger Single-Action Revolver. Schnelle Ziehgeschwindigkeit und solide Präzision auf mittlere Distanz.',
    actionText: 'Ausstatten'
  },
  {
    id: 'lancaster',
    name: 'Lancaster Repetierer',
    type: 'weapon',
    icon: '🎯',
    qty: 1,
    desc: 'Verlässliches Unterhebel-Repetiergewehr mit 14 Schuss Magazinkapazität. Ideal für Schießereien auf offener Straße.',
    actionText: 'Ausstatten'
  },
  {
    id: 'lasso',
    name: 'Geflochtenes Lasso',
    type: 'weapon',
    icon: '🪢',
    qty: 1,
    desc: 'Aus robustem Hanf geflochten. Dient zum Einfangen von Pferden, Flüchtigen und Zeugen ohne tödliche Gewalt.',
    actionText: 'In die Hand nehmen'
  },
  {
    id: 'knife',
    name: 'Jagdmesser',
    type: 'weapon',
    icon: '🗡️',
    qty: 1,
    desc: 'Scharfe Hirschhorngriff-Klinge zum Häuten von erlegtem Wild und für lautlose Angriffe aus dem Hinterhalt.',
    actionText: 'Ausstatten'
  },
  {
    id: 'miracle_tonic',
    name: 'Starker Wundertrank',
    type: 'consumable',
    icon: '🧪',
    qty: 3,
    desc: 'Braune Medizinflasche aus dem Gemischtwarenladen. Stellt Gesundheit und Ausdauer vollständig wieder her.',
    actionText: 'Trinken'
  },
  {
    id: 'snake_oil',
    name: 'Schlangenöl',
    type: 'consumable',
    icon: '🏺',
    qty: 2,
    desc: 'Traditionelles Tonikum. Füllt die Dead-Eye-Anzeige komplett auf und schärft die Sinne.',
    actionText: 'Einnehmen'
  },
  {
    id: 'beans',
    name: 'Dosenbohnen',
    type: 'consumable',
    icon: '🥫',
    qty: 5,
    desc: 'Gekochte Bohnen mit Speck in der Blechdose. Schnelle Stärkung am Lagerfeuer.',
    actionText: 'Essen'
  },
  {
    id: 'tobacco',
    name: 'Kautabak',
    type: 'consumable',
    icon: '🍂',
    qty: 4,
    desc: 'Feinster Kentucky-Kautabak. Verlangsamt die Erschöpfung beim Zielen.',
    actionText: 'Kauen'
  },
  {
    id: 'coyote_pelt',
    name: 'Perfektes Kojotenfell',
    type: 'loot',
    icon: '🐺',
    qty: 2,
    desc: 'Makelloses Fell ohne Schusslöcher, sauber gehäutet. Kann beim Schlachter für $4.50 verkauft werden.',
    actionText: 'Beim Schlachter verkaufen'
  },
  {
    id: 'gold_bar',
    name: 'Massiver Goldbarren',
    type: 'loot',
    icon: '🪙',
    qty: 1,
    desc: 'Gegossener Goldbarren mit Stempel der Valentine Bank. Ein Hehler zahlt gutes Geld dafür.',
    actionText: 'Beim Hehler einlösen'
  },
  {
    id: 'pocket_watch',
    name: 'Silberne Taschenuhr',
    type: 'loot',
    icon: '⏱️',
    qty: 1,
    desc: 'Gravierte Taschenuhr aus Sterlingsilber. Zeigt die genaue Ortszeit an.',
    actionText: 'Begutachten'
  }
];

class RpgMenuManager {
  private logbookModal: HTMLElement | null = null;
  private poiModal: HTMLElement | null = null;
  private poiPromptBanner: HTMLElement | null = null;
  private poiPromptText: HTMLElement | null = null;

  private isLogbookOpen: boolean = false;
  private isPoiModalOpen: boolean = false;

  private activePOI: POIDefinition | null = null;
  private selectedItem: InventoryItem = sampleInventory[0];
  private currentFilter: string = 'all';

  private playerCash: number = 142.50;
  private onTravelCallback: ((destX: number, destY: number) => void) | null = null;

  public init() {
    this.logbookModal = document.getElementById('rpg-menu-modal');
    this.poiModal = document.getElementById('poi-modal');
    this.poiPromptBanner = document.getElementById('poi-prompt-banner');
    this.poiPromptText = document.getElementById('poi-prompt-text');

    // Close buttons
    document.getElementById('close-menu-btn')?.addEventListener('click', () => this.closeLogbook());
    document.getElementById('close-poi-btn')?.addEventListener('click', () => this.closePOIModal());

    // Click on interaction prompt banner
    this.poiPromptBanner?.addEventListener('click', () => {
      if (this.activePOI) this.openPOIModal(this.activePOI);
    });

    // Tab buttons
    document.querySelectorAll('.menu-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Inventory filter buttons
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.currentFilter = target.dataset.filter || 'all';
        this.renderInventory();
      });
    });

    // Keyboard listener for TAB, ESC, and E
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.toggleLogbook();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (this.isPoiModalOpen) this.closePOIModal();
        else if (this.isLogbookOpen) this.closeLogbook();
      } else if (e.key === 'e' || e.key === 'E') {
        if (!this.isAnyModalOpen() && this.activePOI) {
          e.preventDefault();
          this.openPOIModal(this.activePOI);
        }
      }
    });

    this.renderInventory();
    this.updateCashDisplay();
  }

  public setOnTravel(cb: (destX: number, destY: number) => void) {
    this.onTravelCallback = cb;
  }

  public showPOIPrompt(poi: POIDefinition | null) {
    this.activePOI = poi;
    if (!this.poiPromptBanner || !this.poiPromptText) return;

    if (poi && !this.isAnyModalOpen()) {
      this.poiPromptText.textContent = `${poi.name}: [E] ${poi.promptText}`;
      this.poiPromptBanner.classList.add('active');
    } else {
      this.poiPromptBanner.classList.remove('active');
    }
  }

  public openPOIModal(poi: POIDefinition) {
    if (!this.poiModal) return;
    this.isPoiModalOpen = true;
    this.poiModal.classList.add('active');
    this.showPOIPrompt(null);

    const titleEl = document.getElementById('poi-modal-title');
    const contentEl = document.getElementById('poi-modal-content');
    if (titleEl) titleEl.textContent = `★ ${poi.name.toUpperCase()}`;
    if (!contentEl) return;

    contentEl.innerHTML = '';

    // Render content according to category
    switch (poi.category) {
      case 'saloon':
        this.renderSaloonMenu(contentEl);
        break;
      case 'sheriff':
        this.renderSheriffBoard(contentEl);
        break;
      case 'store':
        this.renderGeneralStore(contentEl);
        break;
      case 'stable':
        this.renderStableMenu(contentEl);
        break;
      case 'travel':
        this.renderTravelMenu(contentEl, poi);
        break;
    }
  }

  public closePOIModal() {
    if (!this.poiModal) return;
    this.isPoiModalOpen = false;
    this.poiModal.classList.remove('active');
    if (this.activePOI) this.showPOIPrompt(this.activePOI);
  }

  private renderSaloonMenu(container: HTMLElement) {
    const drinks = [
      { name: 'Kentucky Bourbon', cost: 0.50, icon: '🥃', desc: 'Feinster gebrannter Maiswhiskey. Stellt sofort 50 Ausdauer und Dead Eye her.' },
      { name: 'Kühles Bier vom Fass', cost: 0.25, icon: '🍺', desc: 'Frisch gezapftes Gerstenbier. Erfrischt nach einem langen Ritt durch den Staub.' },
      { name: 'Herzhafter Fleischeintopf', cost: 1.00, icon: '🍲', desc: 'Frisch gekochter Rindfleischeintopf mit Kartoffeln. Stellt alle Kerne wieder her.' }
    ];

    const grid = document.createElement('div');
    grid.className = 'poi-card-grid';

    drinks.forEach((d) => {
      const card = document.createElement('div');
      card.className = 'poi-item-card';
      card.innerHTML = `
        <div class="poi-item-header">
          <span class="poi-item-icon">${d.icon}</span>
          <div>
            <div class="poi-item-title">${d.name}</div>
            <div class="poi-item-cost">$ ${d.cost.toFixed(2)}</div>
          </div>
        </div>
        <div class="poi-item-desc">${d.desc}</div>
        <button class="poi-action-btn">Bestellen & Trinken</button>
      `;

      card.querySelector('button')?.addEventListener('click', () => {
        if (this.playerCash >= d.cost) {
          this.playerCash -= d.cost;
          this.updateCashDisplay();
          this.notifyAction(`${d.name} getrunken! Ausdauer & Gesundheit regeneriert.`);
        } else {
          alert('Nicht genug Bargeld in der Tasche!');
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private renderSheriffBoard(container: HTMLElement) {
    const bounties = [
      { name: 'Blackwater Bill', reward: 35.00, icon: '⭐', desc: 'Gesucht wegen Postkutschen-Raubes. Zuletzt bei den Cumberland Falls gesehen. Tot oder lebendig.' },
      { name: 'Kojotenplage (Farmer-Schutz)', reward: 30.00, icon: '🐺', desc: 'Beseitige 5 Kojoten auf den Weiden östlich von Valentine. Belohnung wird sofort bar ausgezahlt.' },
      { name: 'Six-Shooter Sam', reward: 50.00, icon: '💀', desc: 'Gefährlicher Falschspieler und Desperado. Hat einen Deputy im Saloon erschossen. Nur LEBENDIG!' }
    ];

    const grid = document.createElement('div');
    grid.className = 'poi-card-grid';

    bounties.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'poi-item-card';
      card.innerHTML = `
        <div class="poi-item-header">
          <span class="poi-item-icon">${b.icon}</span>
          <div>
            <div class="poi-item-title">${b.name}</div>
            <div class="poi-item-cost" style="color:#eab308;">Kopfgeld: $ ${b.reward.toFixed(2)}</div>
          </div>
        </div>
        <div class="poi-item-desc">${b.desc}</div>
        <button class="poi-action-btn">Kopfgeld annehmen</button>
      `;

      card.querySelector('button')?.addEventListener('click', (e) => {
        const btn = e.currentTarget as HTMLElement;
        btn.textContent = 'Auftrag aktiv in Tagebuch';
        btn.style.background = '#22c55e';
        this.notifyAction(`Kopfgeld "${b.name}" angenommen! Siehe Logbuch [TAB].`);
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private renderGeneralStore(container: HTMLElement) {
    const goods = [
      { name: 'Revolver-Munition (60 Schuss)', cost: 1.50, icon: '🪙', desc: 'Standardpatronen für alle Single- und Double-Action Revolver.' },
      { name: 'Repetierer-Munition (100 Schuss)', cost: 2.50, icon: '📦', desc: 'Präzisions-Kugeln für Lancaster- und Litchfield-Gewehre.' },
      { name: 'Starker Wundertrank', cost: 4.00, icon: '🧪', desc: 'Medizinische Tinktur zur vollen Wiederherstellung aller Lebenskerne.' },
      { name: 'Kentucky-Kautabak', cost: 1.00, icon: '🍂', desc: 'Schützt vor rascher Erschöpfung beim Zielen.' }
    ];

    const grid = document.createElement('div');
    grid.className = 'poi-card-grid';

    goods.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'poi-item-card';
      card.innerHTML = `
        <div class="poi-item-header">
          <span class="poi-item-icon">${g.icon}</span>
          <div>
            <div class="poi-item-title">${g.name}</div>
            <div class="poi-item-cost">$ ${g.cost.toFixed(2)}</div>
          </div>
        </div>
        <div class="poi-item-desc">${g.desc}</div>
        <button class="poi-action-btn">Kaufen</button>
      `;

      card.querySelector('button')?.addEventListener('click', () => {
        if (this.playerCash >= g.cost) {
          this.playerCash -= g.cost;
          this.updateCashDisplay();
          this.notifyAction(`${g.name} gekauft und ins Inventar gelegt!`);
        } else {
          alert('Nicht genug Bargeld!');
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private renderStableMenu(container: HTMLElement) {
    const grid = document.createElement('div');
    grid.className = 'poi-card-grid';

    const stableOpts = [
      { name: 'Ungarisches Halbblut', cost: 25.00, icon: '🐴', desc: 'Kräftiges, ausdauerndes Streitpferd mit hoher Schreckresistenz.' },
      { name: 'Pferdepflege & Haferfütterung', cost: 2.00, icon: '🌾', desc: 'Bürstet den Schmutz ab und stellt volle Pferde-Ausdauer wieder her.' },
      { name: 'Große Satteltaschen', cost: 12.00, icon: '🎒', desc: 'Ermöglicht das Mitführen von bis zu 4 großen Fellen und extra Proviant.' }
    ];

    stableOpts.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'poi-item-card';
      card.innerHTML = `
        <div class="poi-item-header">
          <span class="poi-item-icon">${s.icon}</span>
          <div>
            <div class="poi-item-title">${s.name}</div>
            <div class="poi-item-cost">$ ${s.cost.toFixed(2)}</div>
          </div>
        </div>
        <div class="poi-item-desc">${s.desc}</div>
        <button class="poi-action-btn">Auswählen</button>
      `;

      card.querySelector('button')?.addEventListener('click', () => {
        if (this.playerCash >= s.cost) {
          this.playerCash -= s.cost;
          this.updateCashDisplay();
          this.notifyAction(`${s.name} aktiviert!`);
        } else {
          alert('Nicht genug Geld im Beutel!');
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private renderTravelMenu(container: HTMLElement, poi: POIDefinition) {
    const isWest = poi.id === 'travel_west';
    const destName = isWest ? 'Strawberry & West Elizabeth' : 'Emerald Ranch & Rhodes (Lemoyne)';
    const fare = 3.50;

    const box = document.createElement('div');
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'center';
    box.style.width = '100%';
    box.style.textAlign = 'center';
    box.style.padding = '20px';

    box.innerHTML = `
      <div style="font-size: 54px; margin-bottom: 14px;">🐎 💨</div>
      <div style="font-family:'Cinzel',serif; font-size:22px; font-weight:800; color:#ebdcb9;">SCHNELLREISE-POSTKUTSCHE</div>
      <div style="font-size:14px; color:#d1c7b7; margin-top:8px;">Zielort: <b style="color:#d4af37;">${destName}</b></div>
      <div style="font-size:12px; color:#8c7e6c; max-width:480px; margin-top:12px; line-height:1.5;">${poi.description}</div>
      <div style="font-family:'Cinzel',serif; font-size:18px; font-weight:700; color:#22c55e; margin-top:18px;">Fahrpreis: $ ${fare.toFixed(2)}</div>
      <button id="confirm-travel-btn" class="item-action-btn" style="padding:12px 32px; font-size:14px; margin-top:20px;">Kutsche besteigen & Reise antreten</button>
    `;

    box.querySelector('#confirm-travel-btn')?.addEventListener('click', () => {
      this.closePOIModal();
      this.executeFastTravel(isWest);
    });

    container.appendChild(box);
  }

  private executeFastTravel(isWest: boolean) {
    const overlay = document.getElementById('transition-overlay');
    overlay?.classList.add('fading');

    setTimeout(() => {
      // Teleport player near opposite road entrance or road center
      const targetX = isWest ? 1280 : 90;
      const targetY = 480;

      if (this.onTravelCallback) {
        this.onTravelCallback(targetX, targetY);
      }

      this.notifyAction(isWest ? 'In West Elizabeth angekommen.' : 'An der Emerald Ranch angekommen.');

      setTimeout(() => {
        overlay?.classList.remove('fading');
      }, 500);
    }, 600);
  }

  private notifyAction(text: string) {
    const banner = document.getElementById('poi-prompt-banner');
    const bannerText = document.getElementById('poi-prompt-text');
    if (banner && bannerText) {
      bannerText.textContent = text;
      banner.classList.add('active');
      setTimeout(() => {
        if (!this.activePOI) banner.classList.remove('active');
      }, 3500);
    }
  }

  private updateCashDisplay() {
    const topCash = document.getElementById('hud-cash-val');
    const charCash = document.getElementById('char-cash-display');
    const val = `$ ${this.playerCash.toFixed(2)}`;
    if (topCash) topCash.textContent = val;
    if (charCash) charCash.textContent = val;
  }

  public toggleLogbook() {
    if (this.isLogbookOpen) this.closeLogbook();
    else this.openLogbook();
  }

  public openLogbook() {
    if (!this.logbookModal) return;
    this.isLogbookOpen = true;
    this.logbookModal.classList.add('active');
    this.showPOIPrompt(null);
  }

  public closeLogbook() {
    if (!this.logbookModal) return;
    this.isLogbookOpen = false;
    this.logbookModal.classList.remove('active');
    if (this.activePOI) this.showPOIPrompt(this.activePOI);
  }

  public isAnyModalOpen(): boolean {
    return this.isLogbookOpen || this.isPoiModalOpen;
  }

  public isMenuOpen(): boolean {
    return this.isAnyModalOpen();
  }

  private switchTab(tabId: string) {
    document.querySelectorAll('.menu-tab-btn').forEach((btn) => {
      const b = btn as HTMLElement;
      b.classList.toggle('active', b.dataset.tab === tabId);
    });

    const tabChar = document.getElementById('tab-char');
    const tabInv = document.getElementById('tab-inv');
    const tabJournal = document.getElementById('tab-journal');

    if (tabChar) tabChar.style.display = tabId === 'char' ? 'flex' : 'none';
    if (tabInv) tabInv.style.display = tabId === 'inv' ? 'flex' : 'none';
    if (tabJournal) tabJournal.style.display = tabId === 'journal' ? 'flex' : 'none';
  }

  private renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const filtered = sampleInventory.filter((item) => {
      if (this.currentFilter === 'all') return true;
      return item.type === this.currentFilter;
    });

    filtered.forEach((item) => {
      const slot = document.createElement('div');
      slot.className = `inv-slot ${this.selectedItem.id === item.id ? 'selected' : ''}`;
      slot.innerHTML = `
        <div class="slot-icon">${item.icon}</div>
        <div class="slot-qty">${item.qty > 1 ? 'x' + item.qty : ''}</div>
      `;

      slot.addEventListener('click', () => {
        document.querySelectorAll('.inv-slot').forEach((s) => s.classList.remove('selected'));
        slot.classList.add('selected');
        this.selectItem(item);
      });

      grid.appendChild(slot);
    });

    const remaining = Math.max(0, 12 - filtered.length);
    for (let i = 0; i < remaining; i++) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'inv-slot';
      emptySlot.style.opacity = '0.3';
      emptySlot.style.cursor = 'default';
      grid.appendChild(emptySlot);
    }

    if (filtered.length > 0 && !filtered.some((it) => it.id === this.selectedItem.id)) {
      this.selectItem(filtered[0]);
    }
  }

  private selectItem(item: InventoryItem) {
    this.selectedItem = item;
    const title = document.getElementById('detail-title');
    const type = document.getElementById('detail-type');
    const desc = document.getElementById('detail-desc');
    const btn = document.getElementById('detail-use-btn');

    if (title) title.textContent = item.name;
    if (type) {
      type.textContent =
        item.type === 'weapon'
          ? 'Waffe & Ausrüstung'
          : item.type === 'consumable'
          ? 'Verbrauchsgegenstand'
          : 'Wertgegenstand & Beute';
    }
    if (desc) desc.textContent = item.desc;
    if (btn) btn.textContent = item.actionText;
  }
}

export const rpgMenuManager = new RpgMenuManager();
