import { VenueDialog, text } from '../venues/VenueDialog';
import { WalletService } from '../economy/WalletService';

export interface TargetItem {
  id: number;
  label: string;
  points: number;
  hit: boolean;
}

export class ShootingRangeModal {
  private activeDialog?: VenueDialog;
  private ammo = 6;
  private maxAmmo = 6;
  private score = 0;
  private shotsFired = 0;
  private hits = 0;
  private targets: TargetItem[] = [];

  constructor(
    private parent: HTMLElement,
    private onChanged: () => void = () => {}
  ) {
    this.resetTargets();
  }

  get isOpen(): boolean {
    return Boolean(this.activeDialog?.isOpen);
  }

  private resetTargets(): void {
    this.ammo = 6;
    this.score = 0;
    this.shotsFired = 0;
    this.hits = 0;
    this.targets = [
      { id: 1, label: '🍾 Whiskey-Flasche 1', points: 10, hit: false },
      { id: 2, label: '🍾 Whiskey-Flasche 2', points: 10, hit: false },
      { id: 3, label: '🎯 Holz-Zielscheibe (Zentrum)', points: 25, hit: false },
      { id: 4, label: '🍾 Schnapsglas auf Zaun', points: 15, hit: false },
      { id: 5, label: '🎯 Klappscheibe (Weite Distanz)', points: 30, hit: false }
    ];
  }

  close(): void {
    try {
      this.activeDialog?.close();
      this.activeDialog = undefined;
    } catch (err) {
      console.error('[ShootingRangeModal] Error closing dialog:', err);
    }
  }

  open(): VenueDialog {
    this.close();
    this.resetTargets();

    const d = new VenueDialog(this.parent, '🎯 Valentine Schießstand · Zielübung');
    d.panel.dataset.venue = 'shooting_range';
    this.activeDialog = d;

    const render = () => {
      d.content.innerHTML = '';

      text('p', 'Du stehst an der Schießlinie des Büchsenmachers. In 15 Schritt Entfernung stehen leere Flaschen und Holzziele auf dem Zaunbalken bereit. Klicke auf ein Ziel, um mit deinem Colt Single Action Army zu schießen!', d.content);

      // HUD: Ammo, Score, Accuracy
      const hud = document.createElement('div');
      hud.style.display = 'flex';
      hud.style.justifyContent = 'space-between';
      hud.style.alignItems = 'center';
      hud.style.background = 'rgba(0,0,0,0.4)';
      hud.style.border = '1px solid rgba(212,175,55,0.3)';
      hud.style.borderRadius = '6px';
      hud.style.padding = '10px 14px';
      hud.style.margin = '10px 0 14px 0';

      const accuracy = this.shotsFired > 0 ? Math.round((this.hits / this.shotsFired) * 100) : 0;

      hud.innerHTML = `
        <div>
          <span style="color:#a89f91; font-size:11px; text-transform:uppercase;">Munition:</span>
          <div style="font-size:16px; font-weight:bold; color:${this.ammo > 0 ? '#ffd700' : '#ef4444'};">
            ${'• '.repeat(this.ammo)}${'◦ '.repeat(this.maxAmmo - this.ammo)} (${this.ammo}/${this.maxAmmo})
          </div>
        </div>
        <div>
          <span style="color:#a89f91; font-size:11px; text-transform:uppercase;">Punkte:</span>
          <div style="font-size:18px; font-weight:bold; color:#4ade80;">${this.score} Pkt</div>
        </div>
        <div>
          <span style="color:#a89f91; font-size:11px; text-transform:uppercase;">Trefferrate:</span>
          <div style="font-size:15px; font-weight:bold; color:#ebdcb9;">${accuracy}%</div>
        </div>
      `;
      d.content.appendChild(hud);

      // Targets Range View
      const rangeView = document.createElement('div');
      rangeView.style.display = 'grid';
      rangeView.style.gridTemplateColumns = 'repeat(auto-fit, minmax(130px, 1fr))';
      rangeView.style.gap = '10px';
      rangeView.style.margin = '14px 0';

      for (const target of this.targets) {
        const btn = document.createElement('button');
        btn.className = `rdo-dialog-btn ${target.hit ? 'rdo-dialog-btn--secondary' : 'rdo-dialog-btn--primary'}`;
        btn.style.padding = '14px 8px';
        btn.style.textAlign = 'center';
        btn.style.display = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.alignItems = 'center';
        btn.style.gap = '4px';
        btn.disabled = target.hit || this.ammo <= 0;

        btn.innerHTML = `
          <span style="font-size:18px;">${target.hit ? '💥' : target.label.split(' ')[0]}</span>
          <b style="font-size:12px; color:${target.hit ? '#786f61' : '#ebdcb9'};">${target.label.slice(2)}</b>
          <span style="font-size:11px; color:${target.hit ? '#50483c' : '#ffd700'};">${target.hit ? 'GETROFFEN' : `+${target.points} Pkt`}</span>
        `;

        btn.addEventListener('click', () => {
          try {
            if (this.ammo <= 0 || target.hit) return;
            this.ammo--;
            this.shotsFired++;
            this.hits++;
            this.score += target.points;
            target.hit = true;

            // Flash effect on button
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => { btn.style.transform = ''; }, 100);

            // Check if all hit
            if (this.targets.every(t => t.hit)) {
              void WalletService.settlePot(10, 'shooting-range-prize').then(() => {
                this.onChanged();
              });
              alert('🎯 Volltreffer! Alle Ziele sauber abgeräumt! Du gewinnst 10 Coins Preisgeld!');
            }

            render();
          } catch (err) {
            console.error(err);
          }
        });

        rangeView.appendChild(btn);
      }

      d.content.appendChild(rangeView);

      // Controls: Reload & Reset & Close
      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.gap = '8px';
      controls.style.marginTop = '14px';

      const reloadBtn = document.createElement('button');
      reloadBtn.className = 'rdo-dialog-btn';
      reloadBtn.textContent = '🔄 Trommel nachladen (Taste R)';
      reloadBtn.disabled = this.ammo === this.maxAmmo;
      reloadBtn.addEventListener('click', () => {
        try {
          this.ammo = this.maxAmmo;
          render();
        } catch (err) {
          console.error(err);
        }
      });
      controls.appendChild(reloadBtn);

      const resetBtn = document.createElement('button');
      resetBtn.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      resetBtn.textContent = 'Ziele neu aufstellen';
      resetBtn.addEventListener('click', () => {
        try {
          this.resetTargets();
          render();
        } catch (err) {
          console.error(err);
        }
      });
      controls.appendChild(resetBtn);

      const exitBtn = document.createElement('button');
      exitBtn.className = 'rdo-dialog-btn rdo-dialog-btn--secondary';
      exitBtn.textContent = 'Schießstand verlassen';
      exitBtn.addEventListener('click', () => this.close());
      controls.appendChild(exitBtn);

      d.content.appendChild(controls);
    };

    render();
    return d;
  }
}
