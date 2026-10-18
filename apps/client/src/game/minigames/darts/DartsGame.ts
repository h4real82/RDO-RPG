import './DartsGame.css';
import { DartsRound, driftingAim, DEFAULT_DARTS, parseDartsVariant, type DartPoint } from './rules';

/** Standalone authored-gameplay practice. The host blocks world input while isOpen. */
export class DartsGame {
  private panel: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private events: AbortController | null = null;
  private frame = 0;
  private startedAt = 0;
  private lastThrowAt = -Infinity;
  private aim: DartPoint = { x: 0, y: 0 };
  private readonly round:DartsRound;
  private disposed = false;

  constructor(private readonly parent: HTMLElement = document.body,variant:unknown=DEFAULT_DARTS) {this.round=new DartsRound(parseDartsVariant(variant));}
  get isOpen(): boolean { return this.panel !== null; }

  open(): void {
    if (this.disposed || this.panel || !this.parent?.isConnected) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = document.createElement('section');
    panel.className = 'saloon-darts';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Valentine Saloon – Darts-Übung');
    panel.innerHTML = `
      <div class="saloon-darts__paper">
        <header class="saloon-darts__header"><div><p class="saloon-darts__eyebrow">VALENTINE · SALOON</p><h2>Darts am Feierabend</h2></div><button type="button" data-action="close" aria-label="Darts schließen">✕</button></header>
        <p class="saloon-darts__intro">${this.round.variant.throws} Würfe. Eine ruhige Hand. Dein bestes Ergebnis.</p>
        <div class="saloon-darts__layout">
          <div class="saloon-darts__board" tabindex="0" role="group" aria-label="Zielscheibe. Mit Maus oder Pfeiltasten zielen, mit Leertaste werfen." aria-describedby="saloon-darts-help">
            <div class="saloon-darts__target"><span class="saloon-darts__ring-label saloon-darts__ring-label--outer">${this.round.variant.rings[2].points}</span><span class="saloon-darts__ring-label saloon-darts__ring-label--middle">${this.round.variant.rings[1].points}</span><span class="saloon-darts__bull">${this.round.variant.rings[0].points}</span></div>
            <div class="saloon-darts__hits" aria-hidden="true"></div><div class="saloon-darts__crosshair" aria-hidden="true">＋</div>
          </div>
          <aside class="saloon-darts__score"><p class="saloon-darts__eyebrow">DEINE RUNDE</p><output class="saloon-darts__total">0</output><span>Punkte · maximal ${this.round.variant.maximumScore}</span><ol class="saloon-darts__throws" aria-label="Wurfergebnisse"></ol><p class="saloon-darts__status" role="status" aria-live="polite" aria-atomic="true"></p></aside>
        </div>
        <p id="saloon-darts-help" class="saloon-darts__help">Maus / Finger oder Pfeiltasten: zielen · Leertaste / Werfen: auslösen. Das Fadenkreuz schwankt gleichmäßig – warte auf den richtigen Moment. Esc: schließen.</p>
        <p class="saloon-darts__legend">Mitte ${this.round.variant.rings[0].points} · mittlerer Ring ${this.round.variant.rings[1].points} · äußerer Ring ${this.round.variant.rings[2].points} · daneben 0</p>
        <footer class="saloon-darts__footer"><button type="button" data-action="throw">Werfen <kbd>Leertaste</kbd></button><button type="button" data-action="reset">Neue Runde</button><small>Lokale Zielübung · eigene Spielgestaltung<br>Keine Einsätze oder Speicherung · kein 501</small></footer>
      </div>`;
    panel.style.setProperty('--darts-inner',`${this.round.variant.rings[0].maximumNormalizedRadius*100}%`);
    panel.style.setProperty('--darts-middle',`${this.round.variant.rings[1].maximumNormalizedRadius*100}%`);
    this.panel = panel;
    this.parent.append(panel);
    this.events = new AbortController();
    const options = { signal: this.events.signal };
    panel.addEventListener('contextmenu',event=>{try{if(event)event.preventDefault();}catch(error){console.warn('Darts context guard failed',error);}},options);
    panel.addEventListener('click', (event) => {
      try {
        if (!this.panel || !event?.target || !(event.target instanceof Element)) return;
        const action = event.target.closest<HTMLElement>('[data-action]')?.dataset.action;
        if (action === 'close') this.close();
        else if (action === 'throw') this.throw();
        else if (action === 'reset') this.reset();
      } catch (error) { console.warn('[SaloonDarts] Aktion fehlgeschlagen', error); }
    }, options);
    // Capture contains keyboard events before host gameplay listeners can consume them.
    document.addEventListener('keydown', (event) => {
      try {
        if (!this.panel || !event || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
        event.stopImmediatePropagation();
        if (event.key === 'Tab') {
          event.preventDefault();
          const focusable = Array.from(this.panel.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
          if (!focusable.length) return;
          const current = focusable.indexOf(document.activeElement as HTMLElement);
          const next = (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
          focusable[next]?.focus();
          return;
        }
        if (event.defaultPrevented) return;
        if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
        if (event.code === 'Space') {
          event.preventDefault();
          if (!event.repeat) this.throw();
          return;
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          if (event.repeat || this.round.complete) return;
          this.aim.x = this.clamp(this.aim.x + (event.key === 'ArrowRight' ? 0.08 : event.key === 'ArrowLeft' ? -0.08 : 0));
          this.aim.y = this.clamp(this.aim.y + (event.key === 'ArrowDown' ? 0.08 : event.key === 'ArrowUp' ? -0.08 : 0));
        }
      } catch (error) { console.warn('[SaloonDarts] Eingabe fehlgeschlagen', error); }
    }, { ...options, capture: true });
    const board = panel.querySelector<HTMLElement>('.saloon-darts__board');
    if (board) {
      const move = (event: PointerEvent): void => {
        try {
          if (!this.panel || !board?.isConnected || !event || this.round.complete) return;
          if (event.type === 'pointermove' && event.pointerType !== 'mouse' && !board.hasPointerCapture(event.pointerId)) return;
          const rect = board.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          this.aim = { x: this.clamp((event.clientX - rect.left - board.clientLeft - board.clientWidth / 2) / (board.clientWidth * 0.42)), y: this.clamp((event.clientY - rect.top - board.clientTop - board.clientHeight / 2) / (board.clientHeight * 0.42)) };
          if (event.type === 'pointerdown') { board.setPointerCapture(event.pointerId); board.focus(); }
        } catch (error) { console.warn('[SaloonDarts] Zielen fehlgeschlagen', error); }
      };
      const release = (event: PointerEvent): void => {
        try { if (board?.isConnected && event && board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId); }
        catch (error) { console.warn('[SaloonDarts] Zeigerfreigabe fehlgeschlagen', error); }
      };
      board.addEventListener('pointerdown', move, options);
      board.addEventListener('pointermove', move, options);
      board.addEventListener('pointerup', release, options);
      board.addEventListener('pointercancel', release, options);
    }
    this.reset();
    panel.querySelector<HTMLButtonElement>('[data-action="close"]')?.focus();
    this.frame = requestAnimationFrame(this.animate);
  }

  close(): void {
    if (!this.panel) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.events?.abort();
    this.events = null;
    this.panel.remove();
    this.panel = null;
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    this.previousFocus = null;
  }

  dispose(): void { this.close(); this.disposed = true; }
  private clamp(value: number): number { return Math.max(-1.15, Math.min(1.15, value)); }
  private readonly animate = (): void => {
    try {
      if (!this.panel) return;
      if (!this.round.complete) {
        const point = driftingAim(this.aim, performance.now() - this.startedAt);
        const crosshair = this.panel.querySelector<HTMLElement>('.saloon-darts__crosshair');
        if (crosshair) { crosshair.style.left = `${50 + point.x * 42}%`; crosshair.style.top = `${50 + point.y * 42}%`; }
      }
      this.frame = requestAnimationFrame(this.animate);
    } catch (error) { console.warn('[SaloonDarts] Anzeige fehlgeschlagen', error); }
  };

  private reset(): void {
    if (!this.panel) return;
    this.round.reset();
    this.aim = { x: 0, y: 0 };
    this.startedAt = performance.now();
    this.lastThrowAt = -Infinity;
    this.panel.querySelector('.saloon-darts__hits')?.replaceChildren();
    this.renderScore(`Bereit für Wurf 1 von ${this.round.variant.throws}.`);
  }

  private throw(): void {
    if (!this.panel || this.round.complete) return;
    const now = performance.now();
    if (now - this.lastThrowAt < this.round.variant.minimumThrowIntervalMs) return;
    const point = driftingAim(this.aim, now - this.startedAt);
    const hit = this.round.throwAt(point);
    if (!hit) return;
    this.lastThrowAt = now;
    const marker = document.createElement('span');
    marker.className = 'saloon-darts__hit';
    marker.textContent = String(this.round.throws.length);
    marker.style.left = `${50 + point.x * 42}%`;
    marker.style.top = `${50 + point.y * 42}%`;
    this.panel.querySelector('.saloon-darts__hits')?.append(marker);
    const outcome = hit.score ? `${hit.score} Punkte.` : 'Daneben – 0 Punkte.';
    this.renderScore(this.round.complete ? `${outcome} Runde beendet: ${this.round.total} von ${this.round.variant.maximumScore} Punkten. Neue Runde für einen weiteren Versuch.` : `${outcome} Wurf ${this.round.throws.length + 1} von ${this.round.variant.throws} ist bereit.`);
  }

  private renderScore(message: string): void {
    if (!this.panel) return;
    const total = this.panel.querySelector('.saloon-darts__total');
    const status = this.panel.querySelector('.saloon-darts__status');
    const list = this.panel.querySelector('.saloon-darts__throws');
    const throwButton = this.panel.querySelector<HTMLButtonElement>('[data-action="throw"]');
    if (total) total.textContent = String(this.round.total);
    if (status) status.textContent = message;
    if (throwButton) throwButton.disabled = this.round.complete;
    this.panel.classList.toggle('saloon-darts--complete', this.round.complete);
    if (list) {
      list.replaceChildren(...Array.from({ length: this.round.variant.throws }, (_, index) => {
        const item = document.createElement('li');
        const hit = this.round.throws[index];
        item.textContent = `${index + 1}. ${hit ? `${hit.score} Pkt.` : '–'}`;
        if (hit) item.classList.add('saloon-darts__throw--done');
        return item;
      }));
    }
  }
}
