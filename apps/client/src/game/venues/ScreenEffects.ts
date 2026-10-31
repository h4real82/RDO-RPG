export class ScreenEffects {
  private static activeTimeouts: number[] = [];

  /**
   * Displays a discreet vintage pixelated mosaic overlay for hotel room rest / private moments.
   */
  static async applyCensorshipPixelEffect(durationMs = 2500): Promise<void> {
    if (typeof document === 'undefined') return;

    return new Promise((resolve) => {
      try {
        const overlay = document.createElement('div');
        overlay.className = 'rdo-censorship-overlay';

        const mosaic = document.createElement('div');
        mosaic.className = 'rdo-censorship-mosaic';
        overlay.append(mosaic);

        const badge = document.createElement('div');
        badge.className = 'rdo-censorship-badge';
        badge.innerHTML = `
          🔒 DISKRETION GEWAHRT
          <span class="rdo-censorship-sub">Zimmer-Ruhepause & Regeneration</span>
        `;
        overlay.append(badge);

        document.body.append(overlay);

        const timer = window.setTimeout(() => {
          overlay.style.transition = 'opacity 0.6s ease-out';
          overlay.style.opacity = '0';
          window.setTimeout(() => {
            overlay.remove();
            resolve();
          }, 600);
        }, durationMs);

        this.activeTimeouts.push(timer);
      } catch (err) {
        console.error('[ScreenEffects] Failed to apply censorship effect:', err);
        resolve();
      }
    });
  }

  static applyDrunkEffect(durationMs = 300000): void {
    this.applyClassEffect('rdo-effect--drunk', durationMs);
  }

  static applyPsychedelicEffect(durationMs = 300000): void {
    this.applyClassEffect('rdo-effect--psychedelic', durationMs);
  }

  static applyInvincibleEffect(durationMs = 300000): void {
    this.applyClassEffect('rdo-effect--invincible', durationMs);
  }

  static applySlowEffect(durationMs = 300000): void {
    this.applyClassEffect('rdo-effect--slow', durationMs);
  }

  private static applyClassEffect(className: string, durationMs: number): void {
    if (typeof document === 'undefined') return;
    try {
      const target = document.body;
      target.classList.add(className);
      const timer = window.setTimeout(() => {
        target.classList.remove(className);
      }, durationMs);
      this.activeTimeouts.push(timer);
    } catch (err) {
      console.error(`[ScreenEffects] Failed to apply ${className}:`, err);
    }
  }

  static clearAll(): void {
    if (typeof document === 'undefined') return;
    for (const id of this.activeTimeouts) {
      clearTimeout(id);
    }
    this.activeTimeouts = [];
    document.body.classList.remove(
      'rdo-effect--drunk',
      'rdo-effect--psychedelic',
      'rdo-effect--invincible',
      'rdo-effect--slow'
    );
    document.querySelectorAll('.rdo-censorship-overlay').forEach((el) => el.remove());
  }
}
