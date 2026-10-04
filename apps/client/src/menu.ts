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
  private modal: HTMLElement | null = null;
  private isOpen: boolean = false;
  private selectedItem: InventoryItem = sampleInventory[0];
  private currentFilter: string = 'all';

  public init() {
    this.modal = document.getElementById('rpg-menu-modal');

    // Close button
    const closeBtn = document.getElementById('close-menu-btn');
    closeBtn?.addEventListener('click', () => this.close());

    // Tab buttons
    const tabBtns = document.querySelectorAll('.menu-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Inventory filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.currentFilter = target.dataset.filter || 'all';
        this.renderInventory();
      });
    });

    // Keyboard listener for TAB and ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });

    // Render initial inventory
    this.renderInventory();
  }

  public toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open() {
    if (!this.modal) return;
    this.isOpen = true;
    this.modal.classList.add('active');
  }

  public close() {
    if (!this.modal) return;
    this.isOpen = false;
    this.modal.classList.remove('active');
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
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

    // Empty placeholder slots to fill a 4x3 grid
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
