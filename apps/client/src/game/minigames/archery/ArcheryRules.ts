export interface ArrowFlightResult {
  targetHitX: number;
  targetHitY: number;
  fatigueJitter: number;
  flightTime: number;
  drop: number;
  windDrift: number;
}

export interface ScoreZone {
  points: number;
  label: string;
  color: string;
  textColor: string;
}

export interface ShotResult {
  shotNumber: number;
  aimX: number;
  aimY: number;
  hitX: number;
  hitY: number;
  points: number;
  zone: ScoreZone;
  wind: WindCondition;
}

export interface WindCondition {
  speed: number; // m/s
  direction: 'Ost' | 'West' | 'Windstill';
  windX: number; // effect on arrow trajectory
}

export interface ArcheryVariant {
  gameId: 'archery';
  rulesVersion: 'valentine-archery-v1';
  entryFee: number;
  totalArrows: number;
  targetDistance: number;
  goldMinScore: number;
  silverMinScore: number;
  bronzeMinScore: number;
  goldPayout: number;
  silverPayout: number;
  bronzePayout: number;
}

export const DEFAULT_ARCHERY_VARIANT: ArcheryVariant = {
  gameId: 'archery',
  rulesVersion: 'valentine-archery-v1',
  entryFee: 25,
  totalArrows: 10,
  targetDistance: 30,
  goldMinScore: 90,
  silverMinScore: 75,
  bronzeMinScore: 50,
  goldPayout: 120,
  silverPayout: 60,
  bronzePayout: 35
};

export function parseArcheryVariant(value: unknown): ArcheryVariant {
  const v = value as Partial<ArcheryVariant> | undefined;
  if (!v || typeof v !== 'object') return DEFAULT_ARCHERY_VARIANT;
  return {
    gameId: 'archery',
    rulesVersion: 'valentine-archery-v1',
    entryFee: typeof v.entryFee === 'number' && v.entryFee >= 0 ? v.entryFee : DEFAULT_ARCHERY_VARIANT.entryFee,
    totalArrows: typeof v.totalArrows === 'number' && v.totalArrows > 0 ? v.totalArrows : DEFAULT_ARCHERY_VARIANT.totalArrows,
    targetDistance: typeof v.targetDistance === 'number' && v.targetDistance > 0 ? v.targetDistance : DEFAULT_ARCHERY_VARIANT.targetDistance,
    goldMinScore: typeof v.goldMinScore === 'number' ? v.goldMinScore : DEFAULT_ARCHERY_VARIANT.goldMinScore,
    silverMinScore: typeof v.silverMinScore === 'number' ? v.silverMinScore : DEFAULT_ARCHERY_VARIANT.silverMinScore,
    bronzeMinScore: typeof v.bronzeMinScore === 'number' ? v.bronzeMinScore : DEFAULT_ARCHERY_VARIANT.bronzeMinScore,
    goldPayout: typeof v.goldPayout === 'number' ? v.goldPayout : DEFAULT_ARCHERY_VARIANT.goldPayout,
    silverPayout: typeof v.silverPayout === 'number' ? v.silverPayout : DEFAULT_ARCHERY_VARIANT.silverPayout,
    bronzePayout: typeof v.bronzePayout === 'number' ? v.bronzePayout : DEFAULT_ARCHERY_VARIANT.bronzePayout
  };
}

export function calculateArrowFlight(
  holdTimeSeconds: number,
  aimX: number,
  aimY: number,
  targetDistance: number = 30,
  windX: number = 0
): ArrowFlightResult {
  const charge = Math.min(1.0, Math.max(0.2, holdTimeSeconds / 1.2));
  let jitter = 0;
  if (holdTimeSeconds > 1.4) {
    const fatigue = holdTimeSeconds - 1.4;
    jitter = Math.sin(fatigue * 12) * 0.04 * Math.min(2.5, Math.pow(fatigue, 1.2));
  }

  // Speed: 35-65 m/s based on bow draw
  const speed = 25 + 40 * charge;
  const flightTime = targetDistance / speed;
  const drop = 0.5 * 9.81 * flightTime * flightTime * (1.0 - charge * 0.4);
  const windDrift = windX * flightTime * 0.35;

  const hitX = aimX + jitter + windDrift;
  const hitY = aimY - (drop * 0.15) + jitter * 0.5;

  return {
    targetHitX: hitX,
    targetHitY: hitY,
    fatigueJitter: Math.abs(jitter),
    flightTime,
    drop,
    windDrift
  };
}

export function evaluateTargetScore(hitX: number, hitY: number, bullseyeX = 0, bullseyeY = 0): ScoreZone {
  const dist = Math.hypot(hitX - bullseyeX, hitY - bullseyeY);

  if (dist <= 0.08) {
    return { points: 10, label: '🎯 Inner Bullseye (10)', color: '#f59e0b', textColor: '#000000' };
  }
  if (dist <= 0.18) {
    return { points: 9, label: 'Gold (9)', color: '#fbbf24', textColor: '#000000' };
  }
  if (dist <= 0.32) {
    return { points: 8, label: 'Rot Innen (8)', color: '#ef4444', textColor: '#ffffff' };
  }
  if (dist <= 0.48) {
    return { points: 7, label: 'Rot Außen (7)', color: '#dc2626', textColor: '#ffffff' };
  }
  if (dist <= 0.65) {
    return { points: 6, label: 'Blau Innen (6)', color: '#3b82f6', textColor: '#ffffff' };
  }
  if (dist <= 0.82) {
    return { points: 5, label: 'Blau Außen (5)', color: '#2563eb', textColor: '#ffffff' };
  }
  if (dist <= 1.00) {
    return { points: 4, label: 'Schwarz Innen (4)', color: '#374151', textColor: '#ffffff' };
  }
  if (dist <= 1.18) {
    return { points: 3, label: 'Schwarz Außen (3)', color: '#1f2937', textColor: '#ffffff' };
  }
  if (dist <= 1.35) {
    return { points: 2, label: 'Weiß Innen (2)', color: '#e5e7eb', textColor: '#111827' };
  }
  if (dist <= 1.50) {
    return { points: 1, label: 'Weiß Außen (1)', color: '#f3f4f6', textColor: '#111827' };
  }
  return { points: 0, label: 'Fehlschuss (0)', color: '#78350f', textColor: '#fef3c7' };
}

export interface TournamentPrize {
  tier: 'gold' | 'silver' | 'bronze' | 'none';
  label: string;
  payout: number;
  message: string;
}

export class ArcheryTournament {
  shots: ShotResult[] = [];
  currentWind: WindCondition = { speed: 0, direction: 'Windstill', windX: 0 };
  roundActive = false;

  constructor(public readonly config: ArcheryVariant = DEFAULT_ARCHERY_VARIANT) {}

  get currentScore(): number {
    return this.shots.reduce((sum, s) => sum + s.points, 0);
  }

  get shotsRemaining(): number {
    return Math.max(0, this.config.totalArrows - this.shots.length);
  }

  get isComplete(): boolean {
    return this.shots.length >= this.config.totalArrows;
  }

  startRound(): void {
    this.shots = [];
    this.roundActive = true;
    this.generateWind();
  }

  generateWind(): WindCondition {
    const r = Math.random();
    if (r < 0.25) {
      this.currentWind = { speed: 0, direction: 'Windstill', windX: 0 };
    } else {
      const isEast = Math.random() > 0.5;
      const speed = parseFloat((1 + Math.random() * 4).toFixed(1)); // 1.0 - 5.0 m/s
      const windX = (isEast ? 1 : -1) * (speed * 0.12);
      this.currentWind = {
        speed,
        direction: isEast ? 'Ost' : 'West',
        windX
      };
    }
    return this.currentWind;
  }

  shoot(holdTimeSeconds: number, aimX: number, aimY: number): ShotResult {
    if (!this.roundActive || this.isComplete) {
      throw new Error('Keine aktive Bogenschießen-Runde.');
    }

    const flight = calculateArrowFlight(
      holdTimeSeconds,
      aimX,
      aimY,
      this.config.targetDistance,
      this.currentWind.windX
    );

    const zone = evaluateTargetScore(flight.targetHitX, flight.targetHitY);
    const shot: ShotResult = {
      shotNumber: this.shots.length + 1,
      aimX,
      aimY,
      hitX: flight.targetHitX,
      hitY: flight.targetHitY,
      points: zone.points,
      zone,
      wind: { ...this.currentWind }
    };

    this.shots.push(shot);

    if (this.isComplete) {
      this.roundActive = false;
    } else {
      // Wind changes slightly between shots
      this.generateWind();
    }

    return shot;
  }

  evaluatePrize(): TournamentPrize {
    const total = this.currentScore;
    if (total >= this.config.goldMinScore) {
      return {
        tier: 'gold',
        label: '🥇 Meisterschütze von Valentine (Gold)',
        payout: this.config.goldPayout,
        message: `Herausragend! Mit ${total} Punkten gewinnst du den 1. Platz und 💰 ${this.config.goldPayout} Coins!`
      };
    }
    if (total >= this.config.silverMinScore) {
      return {
        tier: 'silver',
        label: '🥈 Scharfschütze der Weite (Silber)',
        payout: this.config.silverPayout,
        message: `Starke Leistung! Mit ${total} Punkten sicherst du dir Rang 2 und 💰 ${this.config.silverPayout} Coins!`
      };
    }
    if (total >= this.config.bronzeMinScore) {
      return {
        tier: 'bronze',
        label: '🥉 Treffsicherer Jäger (Bronze)',
        payout: this.config.bronzePayout,
        message: `Solide Runde! Mit ${total} Punkten erreichst du Rang 3 und 💰 ${this.config.bronzePayout} Coins!`
      };
    }
    return {
      tier: 'none',
      label: 'Kein Rang',
      payout: 0,
      message: `Mit ${total} Punkten hast du die Mindestpunktzahl für ein Preisgeld knapp verfehlt. Übe weiter!`
    };
  }
}
