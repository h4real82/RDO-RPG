import { VenueDialog, text } from '../../venues/VenueDialog';
import { WalletService, formatCoins } from '../../economy/WalletService';
import {
  ArcheryTournament,
  parseArcheryVariant,
  type ShotResult,
  type TournamentPrize
} from './ArcheryRules';
import type { Venue } from '../types';

export function create(parent: HTMLElement, variant: unknown, _venue: Venue) {
  const config = parseArcheryVariant(variant);
  let dialog: VenueDialog | undefined;
  let tournament = new ArcheryTournament(config);

  let activeWager = 0;
  let currentAimX = 0;
  let currentAimY = 0;
  let chargeStartTime = 0;
  let isCharging = false;
  let chargeHoldDuration = 1.1; // Default optimal draw
  let lastShot: ShotResult | undefined;
  let lastPrize: TournamentPrize | undefined;

  const refundActiveWager = async () => {
    if (activeWager > 0) {
      const refund = activeWager;
      activeWager = 0;
      await WalletService.refund(refund, 'archery-disconnect-refund');
    }
  };

  const render = () => {
    if (!dialog) return;
    const d = dialog;
    d.content.replaceChildren();

    const walletBalance = WalletService.getSyncBalance();

    // Top Header: Wallet Bar & Status
    const headerBox = document.createElement('div');
    headerBox.className = 'rdo-venue__bar-header';
    d.content.append(headerBox);

    const balPill = text('div', `💰 Dein Guthaben: ${formatCoins(walletBalance)} Coins`, headerBox);
    balPill.className = 'rdo-venue__balance-pill';

    if (activeWager > 0) {
      const betPill = text('span', `🎯 Turnier-Einsatz: 💰 ${activeWager} Coins`, headerBox);
      betPill.className = 'rdo-venue__drink-tag';
      betPill.style.marginLeft = '12px';
      betPill.style.borderColor = '#e4bd67';
      betPill.style.color = '#e4bd67';
    }

    // Archery Range Container
    const rangeContainer = document.createElement('div');
    rangeContainer.style.background = 'radial-gradient(ellipse at center, #2e2619 0%, #17120a 85%, #0d0a06 100%)';
    rangeContainer.style.border = '2px solid #8c754c';
    rangeContainer.style.borderRadius = '8px';
    rangeContainer.style.padding = '16px';
    rangeContainer.style.margin = '14px 0';
    rangeContainer.style.boxShadow = 'inset 0 0 30px #000, 0 8px 30px #0008';
    d.content.append(rangeContainer);

    // Weather & Wind HUD
    const weatherRow = document.createElement('div');
    weatherRow.style.display = 'flex';
    weatherRow.style.justifyContent = 'space-between';
    weatherRow.style.alignItems = 'center';
    weatherRow.style.marginBottom = '12px';
    weatherRow.style.paddingBottom = '8px';
    weatherRow.style.borderBottom = '1px dashed #5d4a2d';
    rangeContainer.append(weatherRow);

    const windInfo = tournament.currentWind.speed > 0
      ? `🌬️ Wind: ${tournament.currentWind.speed} m/s ${tournament.currentWind.direction} (${tournament.currentWind.direction === 'Ost' ? 'Drift nach rechts' : 'Drift nach links'})`
      : '🍃 Windstill (Keine Windabtrift)';
    text('strong', `Distanz: ${config.targetDistance}m · ${windInfo}`, weatherRow);

    const scorePill = text(
      'span',
      `🎯 Treffer: ${tournament.shots.length}/${config.totalArrows} · Gesamt: ${tournament.currentScore} Pkt`,
      weatherRow
    );
    scorePill.style.color = '#fde047';
    scorePill.style.fontWeight = 'bold';

    // SVG Target Board
    const targetWrapper = document.createElement('div');
    targetWrapper.style.display = 'flex';
    targetWrapper.style.justifyContent = 'center';
    targetWrapper.style.margin = '12px 0';
    rangeContainer.append(targetWrapper);

    const targetSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    targetSvg.setAttribute('viewBox', '-180 -180 360 360');
    targetSvg.setAttribute('width', '280');
    targetSvg.setAttribute('height', '280');
    targetSvg.style.borderRadius = '50%';
    targetSvg.style.boxShadow = '0 0 20px rgba(0,0,0,0.8), inset 0 0 15px rgba(0,0,0,0.5)';
    targetSvg.style.cursor = tournament.roundActive ? 'crosshair' : 'default';

    // Straw backboard
    const strawBack = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    strawBack.setAttribute('cx', '0');
    strawBack.setAttribute('cy', '0');
    strawBack.setAttribute('r', '175');
    strawBack.setAttribute('fill', '#855828');
    strawBack.setAttribute('stroke', '#4a2f13');
    strawBack.setAttribute('stroke-width', '6');
    targetSvg.append(strawBack);

    // Target rings (Outer to Inner)
    const rings = [
      { r: 150, color: '#f3f4f6', stroke: '#d1d5db' }, // Ring 1
      { r: 135, color: '#e5e7eb', stroke: '#9ca3af' }, // Ring 2
      { r: 118, color: '#1f2937', stroke: '#111827' }, // Ring 3
      { r: 100, color: '#374151', stroke: '#1f2937' }, // Ring 4
      { r: 82, color: '#2563eb', stroke: '#1d4ed8' },  // Ring 5
      { r: 65, color: '#3b82f6', stroke: '#1d4ed8' },  // Ring 6
      { r: 48, color: '#dc2626', stroke: '#b91c1c' },  // Ring 7
      { r: 32, color: '#ef4444', stroke: '#b91c1c' },  // Ring 8
      { r: 18, color: '#fbbf24', stroke: '#d97706' },  // Ring 9
      { r: 8, color: '#f59e0b', stroke: '#b45309' }    // Bullseye 10
    ];

    for (const ring of rings) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '0');
      circle.setAttribute('cy', '0');
      circle.setAttribute('r', String(ring.r));
      circle.setAttribute('fill', ring.color);
      circle.setAttribute('stroke', ring.stroke);
      circle.setAttribute('stroke-width', '1');
      targetSvg.append(circle);
    }

    // Crosshairs on center
    const chX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    chX.setAttribute('x1', '-12'); chX.setAttribute('y1', '0');
    chX.setAttribute('x2', '12'); chX.setAttribute('y2', '0');
    chX.setAttribute('stroke', '#000000'); chX.setAttribute('stroke-width', '1');
    targetSvg.append(chX);

    const chY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    chY.setAttribute('x1', '0'); chY.setAttribute('y1', '-12');
    chY.setAttribute('x2', '0'); chY.setAttribute('y2', '12');
    chY.setAttribute('stroke', '#000000'); chY.setAttribute('stroke-width', '1');
    targetSvg.append(chY);

    // Render Previous Arrow Impact Holes
    for (const shot of tournament.shots) {
      const impact = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // Scale: 1 meter = 100 SVG units
      const svgX = shot.hitX * 100;
      const svgY = shot.hitY * 100;

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(svgX));
      dot.setAttribute('cy', String(svgY));
      dot.setAttribute('r', '4');
      dot.setAttribute('fill', '#000000');
      dot.setAttribute('stroke', '#ffffff');
      dot.setAttribute('stroke-width', '1.5');
      impact.append(dot);

      targetSvg.append(impact);
    }

    // Click on target to adjust aim offset
    targetSvg.addEventListener('click', (event: MouseEvent) => {
      if (!tournament.roundActive) return;
      const rect = targetSvg.getBoundingClientRect();
      const clickX = ((event.clientX - rect.left) / rect.width * 360 - 180) / 100;
      const clickY = ((event.clientY - rect.top) / rect.height * 360 - 180) / 100;
      currentAimX = Math.max(-1.4, Math.min(1.4, clickX));
      currentAimY = Math.max(-1.4, Math.min(1.4, clickY));
      d.status.textContent = `Zielpunkt angepasst: X=${currentAimX.toFixed(2)}m, Y=${currentAimY.toFixed(2)}m.`;
    });

    targetWrapper.append(targetSvg);

    // Last Shot Feedback Banner
    if (lastShot) {
      const shotBanner = document.createElement('div');
      shotBanner.style.padding = '8px 14px';
      shotBanner.style.margin = '8px 0';
      shotBanner.style.borderRadius = '4px';
      shotBanner.style.fontWeight = 'bold';
      shotBanner.style.background = lastShot.zone.points >= 8 ? '#1a3d24' : lastShot.zone.points >= 5 ? '#1f2937' : '#3d1a1d';
      shotBanner.style.border = `1px solid ${lastShot.zone.points >= 8 ? '#4ade80' : '#8c754c'}`;
      shotBanner.style.color = '#ffffff';
      shotBanner.textContent = `Pfeil #${lastShot.shotNumber}: ${lastShot.zone.label} · +${lastShot.points} Punkte (Abweichung: ${Math.hypot(lastShot.hitX, lastShot.hitY).toFixed(2)}m)`;
      rangeContainer.append(shotBanner);
    }

    // Tournament Final Result Banner
    if (lastPrize) {
      const prizeBanner = document.createElement('div');
      prizeBanner.style.padding = '12px 16px';
      prizeBanner.style.margin = '10px 0';
      prizeBanner.style.borderRadius = '6px';
      prizeBanner.style.fontWeight = 'bold';
      prizeBanner.style.fontSize = '15px';
      if (lastPrize.tier !== 'none') {
        prizeBanner.style.background = '#1a3d24';
        prizeBanner.style.border = '2px solid #4ade80';
        prizeBanner.style.color = '#86efac';
      } else {
        prizeBanner.style.background = '#2e1919';
        prizeBanner.style.border = '2px solid #eab308';
        prizeBanner.style.color = '#fde047';
      }
      prizeBanner.textContent = `${lastPrize.label} · ${lastPrize.message}`;
      rangeContainer.append(prizeBanner);
    }

    // Controls Section
    const controls = document.createElement('div');
    controls.style.margin = '14px 0';
    d.content.append(controls);

    if (!tournament.roundActive) {
      // Lobby / Buy-in Phase
      text('strong', '🏆 Valentine Bogenschützen-Wettkampf:', controls);
      const desc = text(
        'p',
        `Einsatz: ${config.entryFee} Coins für ${config.totalArrows} Pfeile.\nPreise: 🥇 Gold (ab ${config.goldMinScore} Pkt): 💰 ${config.goldPayout} Coins | 🥈 Silber (ab ${config.silverMinScore} Pkt): 💰 ${config.silverPayout} Coins | 🥉 Bronze (ab ${config.bronzeMinScore} Pkt): 💰 ${config.bronzePayout} Coins.`,
        controls
      );
      desc.style.whiteSpace = 'pre-line';
      desc.style.color = '#d1d5db';
      desc.style.fontSize = '14px';

      const canAfford = walletBalance >= BigInt(config.entryFee);
      const startBtn = d.button(
        canAfford ? `🎯 Wettkampf starten (${config.entryFee} Coins)` : `Zu wenig Coins (${config.entryFee})`,
        async () => {
          if (walletBalance < BigInt(config.entryFee)) {
            d.status.textContent = 'Nicht genügend Coins in deiner Geldbörse.';
            return;
          }

          const reserved = await WalletService.reserveBet(config.entryFee, 'archery-tournament');
          if (!reserved) {
            d.status.textContent = 'Einsatz-Buchung fehlgeschlagen.';
            return;
          }

          activeWager = config.entryFee;
          lastShot = undefined;
          lastPrize = undefined;
          currentAimX = 0;
          currentAimY = 0;
          tournament.startRound();
          d.status.textContent = 'Runde gestartet! Spanne die Sehne und schieße ins Schwarze.';
          render();
        },
        controls
      );
      startBtn.disabled = !canAfford;
      startBtn.style.fontWeight = 'bold';
      startBtn.style.fontSize = '16px';
    } else {
      // Active Shooting Phase
      const shootRow = document.createElement('div');
      shootRow.style.display = 'flex';
      shootRow.style.flexWrap = 'wrap';
      shootRow.style.gap = '10px';
      shootRow.style.alignItems = 'center';
      controls.append(shootRow);

      // Shot Action
      const executeShot = async (holdSeconds: number) => {
        const shot = tournament.shoot(holdSeconds, currentAimX, currentAimY);
        lastShot = shot;

        if (tournament.isComplete) {
          const prize = tournament.evaluatePrize();
          lastPrize = prize;
          activeWager = 0;

          if (prize.payout > 0) {
            await WalletService.settlePot(prize.payout, 'archery-prize');
          }

          d.status.textContent = prize.message;
        } else {
          d.status.textContent = `Treffer: ${shot.zone.label} (+${shot.points} Pkt). Noch ${tournament.shotsRemaining} Pfeile.`;
        }
        render();
      };

      // Button: Optimal release
      d.button(`🏹 Pfeil abschießen (Pfeil #${tournament.shots.length + 1})`, () => {
        void executeShot(1.15);
      }, shootRow);

      // Button: Full draw
      d.button('⚡ Schneller Instinktschuss', () => {
        void executeShot(0.65);
      }, shootRow);

      // Button: Aim Reset
      d.button('🎯 Zielmitte zentrieren', () => {
        currentAimX = 0;
        currentAimY = 0;
        d.status.textContent = 'Zielpunkt auf Bullseye zentriert.';
        render();
      }, shootRow);
    }

    // Leave Range Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '20px';
    footer.style.borderTop = '1px solid #766443';
    footer.style.paddingTop = '12px';
    d.content.append(footer);

    d.button('Schießstand verlassen', async () => {
      await refundActiveWager();
      d.close();
    }, footer);
  };

  return {
    get isOpen() {
      return Boolean(dialog?.isOpen);
    },
    open() {
      dialog = new VenueDialog(parent, 'Valentine Bogenschießen · Schießstand', () => {
        void refundActiveWager();
      });
      render();
    },
    dispose() {
      void refundActiveWager();
      dialog?.close();
      dialog = undefined;
    }
  };
}
