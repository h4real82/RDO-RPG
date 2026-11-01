import { VenueDialog, text } from './VenueDialog';
import { WalletService } from '../economy/WalletService';

export interface GraveRecord {
  id: string;
  name: string;
  dates: string;
  epitaph: string;
  lore: string;
}

export interface SecretSpotRecord {
  id: string;
  name: string;
  location: string;
  description: string;
  reward?: number;
}

export const VALENTINE_GRAVES: GraveRecord[] = [
  {
    id: 'grave-1',
    name: 'Jedediah „Lucky“ Finch',
    dates: '1842 – 1888',
    epitaph: '„Er zog schnell, doch die Kugel war schneller. Ruhe sanft mit geladenem Colt.“',
    lore: 'Bekannter Revolverheld der frühen Pionierzeit von New Hanover, fiel in einem Duell vor dem alten Saloon.'
  },
  {
    id: 'grave-2',
    name: 'Clara Mae Higgins',
    dates: '1855 – 1894',
    epitaph: '„Die beste Kuchenbäckerin von Valentine. Gott rief sie zu sich, der Ofen bleibt kalt.“',
    lore: 'Betrieb die erste Bäckerei und stiftete den Kirchglockenfonds für die Gemeinde.'
  },
  {
    id: 'grave-3',
    name: 'Unbekannter Reisender',
    dates: 'Gefunden im November 1898',
    epitaph: '„Kein Name, keine Papiere, nur ein gravierter Taschenkompass. Gott kennt deine Heimat.“',
    lore: 'Erfror bei einem plötzlichen Schneesturm am Übergang zwischen Mount Hagen und Valentine.'
  },
  {
    id: 'grave-4',
    name: 'Silas Thorne',
    dates: '1830 – 1885',
    epitaph: '„Ging nie einem Streit aus dem Weg. Hier fand er endlich seinen Frieden.“',
    lore: 'Gründete eine der ersten Rinderfarmen im Heartlands-Grasland.'
  },
  {
    id: 'grave-5',
    name: 'Constance Adams',
    dates: '1862 – 1899',
    epitaph: '„Vom Dampfross ereilt auf Gleis 2. Mögen die Himmelsgleise sicher sein.“',
    lore: 'Ehefrau des ehemaligen Bahnhofsvorstehers, Valentine Daily Mail widmete ihr einen Nachruf.'
  }
];

export const VALENTINE_SECRET_SPOTS: SecretSpotRecord[] = [
  {
    id: 'secret-stash-saloon',
    name: 'Geheimversteck hinter Smithfields Saloon',
    location: 'Hinter der Holzveranda zwischen Regentonnen',
    description: 'Eine morsche Holzdiele lässt sich zur Seite schieben. Darunter liegt eine alte Tabaksdose mit etwas Notgeld!',
    reward: 15
  },
  {
    id: 'secret-watertower-vantage',
    name: 'Wasserturm-Aussichtspunkt',
    location: 'Aufstieg an der Wartungsleiter am Wassertank der Bahn',
    description: 'Von hier oben überblickst du ganz Valentine: Die Kirche im Osten, den Saloon im Zentrum und die schneebedeckten Gipfel der Grizzlies im Norden.',
    reward: 5
  },
  {
    id: 'secret-bootlegger-barrel',
    name: 'Verlassenes Schwarzbrenner-Fass',
    location: 'Am nördlichen Waldrand hinter den Holzzäunen',
    description: 'Ein vergessenes Eichenfass mit altem Maisbrand aus den Zeiten der Prohibition. Riecht scharf und erdig.',
    reward: 10
  }
];

export class CemeteryModal {
  private activeDialog?: VenueDialog;
  private discoveredSecrets = new Set<string>();

  constructor(
    private parent: HTMLElement,
    private onChanged: () => void = () => {}
  ) {}

  get isOpen(): boolean {
    return Boolean(this.activeDialog?.isOpen);
  }

  close(): void {
    try {
      this.activeDialog?.close();
      this.activeDialog = undefined;
    } catch (err) {
      console.error('[CemeteryModal] Error closing dialog:', err);
    }
  }

  open(): VenueDialog {
    this.close();
    const d = new VenueDialog(this.parent, 'Friedhof von Valentine & Grabsteininschriften');
    d.panel.dataset.venue = 'cemetery';
    this.activeDialog = d;

    const renderMain = () => {
      d.content.innerHTML = '';
      text('p', 'Zwischen verwitterten Holzkreuzen und schlichten Sandstein-Grabmälern pfeift der kühle Bergwind der Grizzlies. Die Inschriften erzählen die bewegte Geschichte von Valentine:', d.content);

      const nav = document.createElement('div');
      nav.style.display = 'flex';
      nav.style.gap = '8px';
      nav.style.margin = '10px 0 14px 0';

      const btnGraves = document.createElement('button');
      btnGraves.className = 'rdo-dialog-btn rdo-dialog-btn--primary';
      btnGraves.textContent = '🪦 Grabsteininschriften lesen';
      btnGraves.addEventListener('click', () => renderGraves());
      nav.appendChild(btnGraves);

      const btnSecrets = document.createElement('button');
      btnSecrets.className = 'rdo-dialog-btn';
      btnSecrets.textContent = '🗺️ Secret Spots & Geheimnisse';
      btnSecrets.addEventListener('click', () => renderSecrets());
      nav.appendChild(btnSecrets);

      d.content.appendChild(nav);
      renderGravesContainer();
    };

    const renderGravesContainer = () => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      container.style.maxHeight = '320px';
      container.style.overflowY = 'auto';
      container.style.paddingRight = '6px';

      for (const grave of VALENTINE_GRAVES) {
        const item = document.createElement('div');
        item.style.background = 'rgba(212,175,55,0.06)';
        item.style.border = '1px solid rgba(212,175,55,0.2)';
        item.style.borderRadius = '4px';
        item.style.padding = '10px 14px';

        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:baseline;">
            <b style="color:#ebdcb9; font-size:14px;">${grave.name}</b>
            <span style="color:#9e9282; font-size:11px; font-style:italic;">${grave.dates}</span>
          </div>
          <div style="color:#ffd700; font-size:12px; font-style:italic; margin:6px 0;">${grave.epitaph}</div>
          <div style="color:#a89f91; font-size:11px;">${grave.lore}</div>
        `;
        container.appendChild(item);
      }

      d.content.appendChild(container);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      closeBtn.style.marginTop = '12px';
      closeBtn.textContent = 'Friedhof verlassen';
      closeBtn.addEventListener('click', () => this.close());
      d.content.appendChild(closeBtn);
    };

    const renderGraves = () => {
      d.content.innerHTML = '';
      renderMain();
    };

    const renderSecrets = () => {
      d.content.innerHTML = '';
      text('p', 'Entdecke verborgene Ecken, Aussichtspunkte und alte Verstecke rund um Valentine:', d.content);

      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      container.style.maxHeight = '320px';
      container.style.overflowY = 'auto';

      for (const spot of VALENTINE_SECRET_SPOTS) {
        const discovered = this.discoveredSecrets.has(spot.id);
        const item = document.createElement('div');
        item.style.background = 'rgba(212,175,55,0.06)';
        item.style.border = '1px solid rgba(212,175,55,0.2)';
        item.style.borderRadius = '4px';
        item.style.padding = '10px 14px';

        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:baseline;">
            <b style="color:#ebdcb9; font-size:13px;">🔍 ${spot.name}</b>
            <span style="color:${discovered ? '#4ade80' : '#ffd700'}; font-size:11px; font-weight:bold;">
              ${discovered ? '✓ Entdeckt' : `+${spot.reward ?? 0} Coins`}
            </span>
          </div>
          <div style="color:#9e9282; font-size:11px; margin-top:2px;">Ort: ${spot.location}</div>
          <div style="color:#c5b8a5; font-size:12px; margin-top:6px;">${spot.description}</div>
        `;

        if (!discovered && spot.reward) {
          const lootBtn = document.createElement('button');
          lootBtn.className = 'rdo-dialog-btn';
          lootBtn.style.marginTop = '8px';
          lootBtn.textContent = `Versteck durchsuchen (+${spot.reward} Coins)`;
          lootBtn.addEventListener('click', async () => {
            try {
              this.discoveredSecrets.add(spot.id);
              if (spot.reward) {
                await WalletService.settlePot(spot.reward, 'secret-stash');
              }
              this.onChanged();
              renderSecrets();
            } catch (err) {
              console.error(err);
            }
          });
          item.appendChild(lootBtn);
        }

        container.appendChild(item);
      }

      d.content.appendChild(container);

      const backBtn = document.createElement('button');
      backBtn.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      backBtn.style.marginTop = '12px';
      backBtn.textContent = '← Zurück zur Friedhofsübersicht';
      backBtn.addEventListener('click', () => renderMain());
      d.content.appendChild(backBtn);
    };

    renderMain();
    return d;
  }
}
