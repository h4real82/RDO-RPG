import { POIDefinition } from '@rdo-rpg/shared';
import fastTravelPointsJson from './world/data/fastTravelPoints.json';

export interface FastTravelPoint {
  id: string;
  name: string;
  game_x: number;
  game_y: number;
  elevation: number;
  three_pos: [number, number, number];
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'consumable' | 'loot';
  icon: string;
  qty: number;
  desc: string;
  actionText: string;
}

export interface BountyPoster {
  id: string;
  name: string;
  reward: number;
  icon: string;
  desc: string;
  condition: 'dead_or_alive' | 'alive_only' | 'hunt';
  posterUrl?: string; // external or mock image URL / SVG placeholder
}

/**
 * Generates a lightweight, embedded SVG data-URI placeholder for bounty posters
 * avoiding binary asset repository bloating.
 */
export function generatePosterPlaceholder(name: string, reward: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="260" viewBox="0 0 200 260">
    <rect width="100%" height="100%" fill="#e8d8b8" stroke="#5a3d28" stroke-width="6"/>
    <rect x="8" y="8" width="184" height="244" fill="none" stroke="#8b5a2b" stroke-width="1.5" stroke-dasharray="4 2"/>
    <text x="100" y="32" font-family="serif" font-size="20" font-weight="900" fill="#2d1e12" text-anchor="middle">WANTED</text>
    <line x1="30" y1="38" x2="170" y2="38" stroke="#2d1e12" stroke-width="2"/>
    <rect x="35" y="48" width="130" height="110" fill="#c4b08e" stroke="#2d1e12" stroke-width="2"/>
    <circle cx="100" cy="90" r="28" fill="#5a3d28"/>
    <ellipse cx="100" cy="140" rx="42" ry="22" fill="#5a3d28"/>
    <text x="100" y="180" font-family="serif" font-size="13" font-weight="bold" fill="#1c120a" text-anchor="middle">${name.toUpperCase()}</text>
    <text x="100" y="210" font-family="serif" font-size="16" font-weight="900" fill="#8b0000" text-anchor="middle">REWARD $${reward.toFixed(0)}</text>
    <text x="100" y="235" font-family="serif" font-size="9" font-weight="bold" fill="#4a3520" text-anchor="middle">DEAD OR ALIVE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
  private isFastTravelOpen: boolean = false;

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

    // Click on backdrop to close modals
    this.poiModal?.addEventListener('click', (e) => {
      if (e.target === this.poiModal) this.closePOIModal();
    });
    this.logbookModal?.addEventListener('click', (e) => {
      if (e.target === this.logbookModal) this.closeLogbook();
    });

    // Keyboard listener for TAB, ESC, E, and F (F opens Fast Travel overlay)
    window.addEventListener('keydown', (e) => {
      try {
        if (e.key === 'Tab') {
          e.preventDefault();
          this.toggleLogbook();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (this.isFastTravelOpen) this.closeFastTravelModal();
          else if (this.isPoiModalOpen) this.closePOIModal();
          else if (this.isLogbookOpen) this.closeLogbook();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          if (this.isPoiModalOpen) {
            this.closePOIModal();
          } else {
            this.openFastTravelModal();
          }
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          if (this.isPoiModalOpen) {
            this.closePOIModal();
          } else if (!this.isAnyModalOpen() && this.activePOI) {
            const targetPoi = this.activePOI;
            setTimeout(() => {
              try {
                this.openPOIModal(targetPoi);
              } catch (openErr) {
                console.error('[RpgMenuManager] Error opening POI modal asynchronously:', openErr);
              }
            }, 0);
          }
        }
      } catch (err) {
        console.error('[RpgMenuManager] Error in keydown handler:', err);
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

    try {
      if (poi && !this.isAnyModalOpen()) {
        this.poiPromptText.textContent = `[E] Interagieren mit ${poi.name}`;
        this.poiPromptBanner.classList.add('active');
        this.poiPromptBanner.style.display = 'flex';
      } else {
        this.poiPromptBanner.classList.remove('active');
        this.poiPromptBanner.style.display = 'none';
      }
    } catch (err) {
      console.error('[RpgMenuManager] Error updating POI prompt banner:', err);
    }
  }

  public openPOIModal(poi: POIDefinition) {
    try {
      if (!this.poiModal) {
        console.warn('[RpgMenuManager] poiModal DOM element not found.');
        return;
      }
      this.activePOI = poi;
      this.isPoiModalOpen = true;
      this.poiModal.classList.add('active');
      this.poiModal.style.display = 'flex';
      this.poiModal.style.zIndex = '9999';
      if (this.poiPromptBanner) {
        this.poiPromptBanner.classList.remove('active');
        this.poiPromptBanner.style.display = 'none';
      }

      // Asynchrone, unblockierte Entkopplung für Audio-Playback
      setTimeout(() => {
        try {
          if (typeof (window as any).__playPOISound === 'function') {
            (window as any).__playPOISound(poi);
          }
        } catch (audioErr) {
          console.warn('[RpgMenuManager] Defensive catch on async POI audio playback:', audioErr);
        }
      }, 0);

      const titleEl = document.getElementById('poi-modal-title');
      const contentEl = document.getElementById('poi-modal-content');
      if (titleEl) titleEl.textContent = `★ ${(poi.name || 'UNBEKANNTER ORT').toUpperCase()}`;
      if (!contentEl) return;

      contentEl.innerHTML = '';

      // Render content according to category with safe fallback
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
        case 'doctor':
          this.renderDoctorClinic(contentEl);
          break;
        case 'stable':
          this.renderStableMenu(contentEl);
          break;
        case 'church':
          this.renderChurchMenu(contentEl);
          break;
        case 'station':
          this.renderStationMenu(contentEl);
          break;
        case 'travel':
          this.renderTravelMenu(contentEl, poi);
          break;
        default:
          this.renderGenericMenu(contentEl, poi);
          break;
      }
    } catch (err) {
      console.error('[RpgMenuManager] Error opening POI modal:', err);
      // Ensure we don't remain stuck in an unclickable or frozen state
      this.closePOIModal();
    }
  }

  private renderGenericMenu(container: HTMLElement, poi: POIDefinition) {
    const box = document.createElement('div');
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'center';
    box.style.padding = '24px';
    box.style.textAlign = 'center';

    box.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 12px;">${poi.icon || '📍'}</div>
      <div style="font-family:'Cinzel',serif; font-size:20px; font-weight:700; color:#ebdcb9;">${poi.name}</div>
      <div style="font-size:14px; color:#c5b8a5; max-width:440px; margin-top:10px; line-height:1.5;">${poi.description || 'Ein interessanter Ort in Valentine.'}</div>
      <button id="close-generic-poi-btn" class="item-action-btn" style="margin-top:20px; padding:10px 24px;">Schließen</button>
    `;

    box.querySelector('#close-generic-poi-btn')?.addEventListener('click', () => {
      this.closePOIModal();
    });

    container.appendChild(box);
  }

  public closePOIModal() {
    if (!this.poiModal) return;
    this.isPoiModalOpen = false;
    this.poiModal.classList.remove('active');
    this.poiModal.style.display = 'none';
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
          this.notifyAction('Nicht genug Bargeld in der Tasche!');
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private renderSheriffBoard(container: HTMLElement) {
    const bounties: BountyPoster[] = [
      {
        id: 'bill',
        name: 'Blackwater Bill',
        reward: 35.00,
        icon: '⭐',
        desc: 'Gesucht wegen Postkutschen-Raubes. Zuletzt bei den Cumberland Falls gesehen. Tot oder lebendig.',
        condition: 'dead_or_alive'
      },
      {
        id: 'coyotes',
        name: 'Kojotenplage (Farmer-Schutz)',
        reward: 30.00,
        icon: '🐺',
        desc: 'Beseitige 5 Kojoten auf den Weiden östlich von Valentine. Belohnung wird sofort bar ausgezahlt.',
        condition: 'hunt'
      },
      {
        id: 'sam',
        name: 'Six-Shooter Sam',
        reward: 50.00,
        icon: '💀',
        desc: 'Gefährlicher Falschspieler und Desperado. Hat einen Deputy im Saloon erschossen. Nur LEBENDIG!',
        condition: 'alive_only'
      }
    ];

    const grid = document.createElement('div');
    grid.className = 'poi-card-grid';

    bounties.forEach((b) => {
      const posterSrc = b.posterUrl || generatePosterPlaceholder(b.name, b.reward);
      const card = document.createElement('div');
      card.className = 'poi-item-card';
      card.innerHTML = `
        <div style="display:flex; gap:12px; margin-bottom:8px;">
          <img src="${posterSrc}" alt="${b.name}" style="width:64px; height:84px; object-fit:contain; border-radius:3px; border:1px solid #5a3d28; background:#e8d8b8; flex-shrink:0;" />
          <div style="flex:1;">
            <div class="poi-item-header" style="margin-bottom:4px;">
              <span class="poi-item-icon">${b.icon}</span>
              <div>
                <div class="poi-item-title">${b.name}</div>
                <div class="poi-item-cost" style="color:#eab308;">Kopfgeld: $ ${b.reward.toFixed(2)}</div>
              </div>
            </div>
            <div class="poi-item-desc" style="font-size:11px;">${b.desc}</div>
          </div>
        </div>
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
          this.notifyAction('Nicht genug Bargeld im Beutel!');
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private renderDoctorClinic(container: HTMLElement) {
    const remedies = [
      { name: 'Wundbehandlung & Naht', cost: 2.50, icon: '🩺', desc: 'Chirurgische Erstversorgung durch Dr. Barnes. Stellt die Lebensenergie vollständig wieder her.' },
      { name: 'Starke Arznei', cost: 3.50, icon: '🧪', desc: 'Wirksame Heiltinktur. Heilt Schusswunden und schützt 10 Minuten vor Infektionen.' },
      { name: 'Original Schlangenöl', cost: 2.75, icon: '🏺', desc: 'Stellt Dead-Eye-Konzentration wieder her und schärft die Schusspräzision.' },
      { name: 'Wundertrank (Spezialrezeptur)', cost: 5.00, icon: '✨', desc: 'Goldene Medizinflasche. Verleiht einen goldenen Überbalken für Ausdauer und Gesundheit.' }
    ];

    const grid = document.createElement('div');
    grid.className = 'poi-card-grid';

    remedies.forEach((r) => {
      const card = document.createElement('div');
      card.className = 'poi-item-card';
      card.innerHTML = `
        <div class="poi-item-header">
          <span class="poi-item-icon">${r.icon}</span>
          <div>
            <div class="poi-item-title">${r.name}</div>
            <div class="poi-item-cost">$ ${r.cost.toFixed(2)}</div>
          </div>
        </div>
        <div class="poi-item-desc">${r.desc}</div>
        <button class="poi-action-btn">Behandeln / Kaufen</button>
      `;

      card.querySelector('button')?.addEventListener('click', () => {
        if (this.playerCash >= r.cost) {
          this.playerCash -= r.cost;
          this.updateCashDisplay();
          this.notifyAction(`${r.name} erhalten! Volle Vitalität wiederhergestellt.`);
        } else {
          this.notifyAction('Nicht genug Bargeld für die Behandlung!');
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
          this.notifyAction('Nicht genug Geld im Beutel!');
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private renderChurchMenu(container: HTMLElement) {
    const grid = document.createElement('div');
    grid.className = 'poi-card-grid';

    const churchOpts = [
      { name: 'Andacht halten & Kerze stiften', cost: 0.50, icon: '🕯️', desc: 'Zünde eine Votivkerze in der Kirche an. Stellt alle Lebensenergie- und Dead-Eye-Kerne vollständig her.' },
      { name: 'Priestersegen von Pfarrer Thomas', cost: 1.00, icon: '✝️', desc: 'Empfange die Absolution. Erhöht deine Ehre (Honor) und verringert deinen Bekanntheitsgrad bei Gesetzeshütern.' },
      { name: 'Kirchturm-Glockengeläut spenden', cost: 2.00, icon: '🔔', desc: 'Die Bronzeglocken im Turm läuten feierlich über ganz Valentine und hallen durch das Tal.' }
    ];

    churchOpts.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'poi-item-card';
      card.innerHTML = `
        <div class="poi-item-header">
          <span class="poi-item-icon">${c.icon}</span>
          <div>
            <div class="poi-item-title">${c.name}</div>
            <div class="poi-item-cost">$ ${c.cost.toFixed(2)}</div>
          </div>
        </div>
        <div class="poi-item-desc">${c.desc}</div>
        <button class="poi-action-btn">Empfangen</button>
      `;

      card.querySelector('button')?.addEventListener('click', () => {
        if (this.playerCash >= c.cost) {
          this.playerCash -= c.cost;
          this.updateCashDisplay();
          this.notifyAction(`${c.name} gewährt! Wohlwollen und Segen erhalten.`);
        } else {
          this.notifyAction('Nicht genug Geld im Beutel!');
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private renderStationMenu(container: HTMLElement) {
    const grid = document.createElement('div');
    grid.className = 'poi-card-grid';

    const stationOpts = [
      { name: 'Zugfahrkarte nach Saint Denis', cost: 5.00, icon: '🚂', desc: 'Schnellzug-Fahrkarte in die Metropole Saint Denis in Lemoyne mit Speisewagen.' },
      { name: 'Zugfahrkarte nach Rhodes & Flatneck', cost: 3.50, icon: '🎫', desc: 'Fahrt über die großen Viehweiden und den Flatiron Lake nach Scarlett Meadows.' },
      { name: 'Telegrafenamt: Telegramm versenden', cost: 1.00, icon: '✉️', desc: 'Sende ein dringendes Telegrafen-Kabel an die Pinkerton National Detective Agency.' }
    ];

    stationOpts.forEach((s) => {
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
        <button class="poi-action-btn">Fahrkarte lösen</button>
      `;

      card.querySelector('button')?.addEventListener('click', () => {
        if (this.playerCash >= s.cost) {
          this.playerCash -= s.cost;
          this.updateCashDisplay();
          this.notifyAction(`${s.name} gebucht! Schaffner pfeift zur Abfahrt.`);
        } else {
          this.notifyAction('Nicht genug Geld für die Fahrkarte!');
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
      // Teleport player near opposite road entrance or road center (in world 3D meters)
      const targetX = isWest ? 128.0 : 9.0;
      const targetY = 48.0;

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
    return this.isLogbookOpen || this.isPoiModalOpen || this.isFastTravelOpen;
  }

  /** Opens a Fast Travel overlay (F key) listing all known fast-travel points. */
  public openFastTravelModal() {
    try {
      if (this.isFastTravelOpen) {
        this.closeFastTravelModal();
        return;
      }

      // Remove any stale overlay
      document.getElementById('fast-travel-overlay')?.remove();

      this.isFastTravelOpen = true;

      const overlay = document.createElement('div');
      overlay.id = 'fast-travel-overlay';
      overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:10000',
        'background:rgba(0,0,0,0.78)',
        'display:flex', 'align-items:center', 'justify-content:center',
        'font-family:\'Cinzel\',serif',
      ].join(';');

      const box = document.createElement('div');
      box.style.cssText = [
        'background:#1a110a', 'border:2px solid #7a5c38',
        'border-radius:8px', 'padding:28px 36px',
        'min-width:360px', 'max-width:520px', 'max-height:80vh',
        'overflow-y:auto', 'box-shadow:0 8px 40px rgba(0,0,0,0.8)',
      ].join(';');

      box.innerHTML = `
        <div style="font-size:22px;font-weight:700;color:#ebdcb9;margin-bottom:4px;letter-spacing:2px;">&#x1F686; SCHNELLREISE</div>
        <div style="font-size:12px;color:#8c7a6b;margin-bottom:18px;">Drücke F oder ESC zum Schließen</div>
        <div id="ft-dest-list" style="display:flex;flex-direction:column;gap:8px;"></div>
      `;

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      // Close on backdrop click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeFastTravelModal();
      });

      // Populate destinations from imported ground truth fastTravelPointsJson
      const list = document.getElementById('ft-dest-list');
      if (!list) return;

      const destinations: Array<{ id: string; name: string; region: string; x: number; z: number }> = (
        fastTravelPointsJson as FastTravelPoint[]
      ).map((p) => {
        let region = 'Frontier';
        if (p.game_x < -2000) region = 'New Austin';
        else if (p.game_y > 1600) region = 'Ambarino';
        else if (p.game_x > 1800 && p.game_y < -600) region = 'Lemoyne';
        else if (p.game_x < 0 && p.game_y < 0) region = 'West Elizabeth';
        else region = 'New Hanover';

        return {
          id: p.id,
          name: p.name,
          region,
          x: p.three_pos[0],
          z: p.three_pos[2],
        };
      });

      const TRAVEL_COST = 0.50;

      destinations.forEach((dest) => {
        const btn = document.createElement('button');
        btn.style.cssText = [
          'display:flex', 'align-items:center', 'justify-content:space-between',
          'width:100%', 'padding:10px 14px',
          'background:#2a1c12', 'border:1px solid #5a3d28',
          'border-radius:5px', 'cursor:pointer',
          'color:#ebdcb9', 'font-family:inherit', 'font-size:14px',
          'transition:background 0.15s',
        ].join(';');

        btn.innerHTML = `
          <span>&#x1F4CD; ${dest.name} <span style="color:#8c7a6b;font-size:11px;">&nbsp;${dest.region}</span></span>
          <span style="color:#eab308;font-size:12px;">$ ${TRAVEL_COST.toFixed(2)}</span>
        `;

        btn.addEventListener('mouseenter', () => { btn.style.background = '#3d2a1a'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#2a1c12'; });

        btn.addEventListener('click', () => {
          try {
            if (this.playerCash < TRAVEL_COST) {
              this.notifyAction('Nicht genug Bargeld für die Kutsche!');
              return;
            }
            this.playerCash -= TRAVEL_COST;
            this.updateCashDisplay();
            this.closeFastTravelModal();
            this.notifyAction(`Gereist nach ${dest.name}. Kosten: $ ${TRAVEL_COST.toFixed(2)}`);
            if (this.onTravelCallback) {
              this.onTravelCallback(dest.x, dest.z);
            }
          } catch (tErr) {
            console.error('[FastTravel] Error during travel callback:', tErr);
          }
        });

        list.appendChild(btn);
      });
    } catch (err) {
      console.error('[RpgMenuManager] openFastTravelModal error:', err);
      this.closeFastTravelModal();
    }
  }

  private closeFastTravelModal() {
    try {
      document.getElementById('fast-travel-overlay')?.remove();
    } catch (_) { /* silent */ }
    this.isFastTravelOpen = false;
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
