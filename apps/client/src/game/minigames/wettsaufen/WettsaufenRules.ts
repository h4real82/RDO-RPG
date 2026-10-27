export type DrinkType = 'beer' | 'whiskey' | 'moonshine' | 'mezcal';

export interface DrinkConfig {
  name: string;
  alcoholPct: number;
  energyCost: number;
  qteToleranceMs: number;
  flavour: string;
}

export const DRINKS: Record<DrinkType, DrinkConfig> = {
  beer: {
    name: 'Kühles Saloon-Pils',
    alcoholPct: 10,
    energyCost: 6,
    qteToleranceMs: 350,
    flavour: 'Frisch gezapft aus dem Eichenfass. Geht runter wie Öl.'
  },
  whiskey: {
    name: 'Rye Whiskey',
    alcoholPct: 25,
    energyCost: 15,
    qteToleranceMs: 240,
    flavour: 'Brennt wie Zunder in der Kehle. Ein echter Magenwärmer.'
  },
  moonshine: {
    name: 'Schwarzgebrannter Moonshine',
    alcoholPct: 45,
    energyCost: 28,
    qteToleranceMs: 160,
    flavour: 'Illegal destilliert im Wald. Riecht nach Terpentin und schlägt ein wie Dynamit.'
  },
  mezcal: {
    name: 'Meskal mit Wurm',
    alcoholPct: 60,
    energyCost: 40,
    qteToleranceMs: 110,
    flavour: 'Mexikanischer Agavenbrand samt Wurm. Bringt die Wände zum Tanzen!'
  }
};

export interface DrunkardState {
  name: string;
  energy: number; // 100 -> 0 (KO)
  intoxication: number; // 0 -> 100%
  drinksConsumed: number;
}

export interface WettsaufenVariant {
  gameId: 'wettsaufen';
  rulesVersion: 'valentine-wettsaufen-v1';
  minBet: number;
  maxBet: number;
  initialEnergy: number;
  koThreshold: number;
}

export const DEFAULT_WETTSAUFEN_VARIANT: WettsaufenVariant = {
  gameId: 'wettsaufen',
  rulesVersion: 'valentine-wettsaufen-v1',
  minBet: 15,
  maxBet: 150,
  initialEnergy: 100,
  koThreshold: 0
};

export function parseWettsaufenVariant(value: unknown): WettsaufenVariant {
  const v = value as Partial<WettsaufenVariant> | undefined;
  if (!v || typeof v !== 'object') return DEFAULT_WETTSAUFEN_VARIANT;
  return {
    gameId: 'wettsaufen',
    rulesVersion: 'valentine-wettsaufen-v1',
    minBet: typeof v.minBet === 'number' && v.minBet > 0 ? v.minBet : DEFAULT_WETTSAUFEN_VARIANT.minBet,
    maxBet: typeof v.maxBet === 'number' && v.maxBet >= (v.minBet ?? 15) ? v.maxBet : DEFAULT_WETTSAUFEN_VARIANT.maxBet,
    initialEnergy: typeof v.initialEnergy === 'number' ? v.initialEnergy : DEFAULT_WETTSAUFEN_VARIANT.initialEnergy,
    koThreshold: typeof v.koThreshold === 'number' ? v.koThreshold : DEFAULT_WETTSAUFEN_VARIANT.koThreshold
  };
}

export function drinkRound(
  state: DrunkardState,
  drink: DrinkType,
  qteQuality: 'perfect' | 'good' | 'miss'
): { state: DrunkardState; isKO: boolean; energyLost: number } {
  const cfg = DRINKS[drink];
  let multiplier = 1.0;
  if (qteQuality === 'perfect') multiplier = 0.65; // Clean gulp, minimal strain
  else if (qteQuality === 'good') multiplier = 1.0;
  else multiplier = 2.0; // Choked / coughed, double strain!

  const energyLost = Math.round(cfg.energyCost * multiplier);
  const newEnergy = Math.max(0, state.energy - energyLost);
  const newIntox = Math.min(100, state.intoxication + cfg.alcoholPct);

  return {
    state: {
      name: state.name,
      energy: newEnergy,
      intoxication: newIntox,
      drinksConsumed: state.drinksConsumed + 1
    },
    isKO: newEnergy <= 0,
    energyLost
  };
}

export function calculateInputDistortionLag(intoxication: number): number {
  if (intoxication < 25) return 0;
  return Math.min(300, (intoxication - 25) * 4); // Up to 300ms lag
}

export class CounterDuelGame {
  player: DrunkardState;
  opponent: DrunkardState;
  currentBet = 0;
  roundActive = false;
  roundNumber = 0;

  constructor(
    public readonly config: WettsaufenVariant = DEFAULT_WETTSAUFEN_VARIANT,
    opponentName = 'Onkel Bill'
  ) {
    this.player = { name: 'Du', energy: config.initialEnergy, intoxication: 0, drinksConsumed: 0 };
    this.opponent = { name: opponentName, energy: config.initialEnergy, intoxication: 0, drinksConsumed: 0 };
  }

  startDuel(bet: number): void {
    if (bet < this.config.minBet || bet > this.config.maxBet) {
      throw new Error(`Einsatz muss zwischen ${this.config.minBet} und ${this.config.maxBet} Coins liegen.`);
    }
    this.currentBet = bet;
    this.player = { name: 'Du', energy: this.config.initialEnergy, intoxication: 0, drinksConsumed: 0 };
    this.opponent = { name: this.opponent.name, energy: this.config.initialEnergy, intoxication: 0, drinksConsumed: 0 };
    this.roundActive = true;
    this.roundNumber = 1;
  }

  executeRound(
    drink: DrinkType,
    playerQte: 'perfect' | 'good' | 'miss'
  ): {
    playerResult: { state: DrunkardState; isKO: boolean; energyLost: number };
    opponentResult: { state: DrunkardState; isKO: boolean; energyLost: number; qte: 'perfect' | 'good' | 'miss' };
    winner?: 'player' | 'opponent' | 'both_ko';
    payout: number;
    message: string;
  } {
    if (!this.roundActive) throw new Error('Kein aktives Wettsaufen-Duell.');

    // Player drink
    const playerResult = drinkRound(this.player, drink, playerQte);
    this.player = playerResult.state;

    // Opponent drink with AI skill based on current intoxication
    const oppRoll = Math.random() * 100;
    const failChance = 15 + this.opponent.intoxication * 0.55;
    const oppQte: 'perfect' | 'good' | 'miss' =
      oppRoll < failChance ? 'miss' : oppRoll < failChance + 45 ? 'good' : 'perfect';

    const opponentResult = {
      ...drinkRound(this.opponent, drink, oppQte),
      qte: oppQte
    };
    this.opponent = opponentResult.state;

    this.roundNumber += 1;

    // Check KO Conditions
    if (playerResult.isKO && opponentResult.isKO) {
      this.roundActive = false;
      return {
        playerResult,
        opponentResult,
        winner: 'both_ko',
        payout: this.currentBet, // Push: Bet returned
        message: 'Beide Outlaws sind gleichzeitig vom Barhocker gefallen! Unentschieden (Einsatz zurück).'
      };
    }

    if (playerResult.isKO) {
      this.roundActive = false;
      return {
        playerResult,
        opponentResult,
        winner: 'opponent',
        payout: 0,
        message: `💥 Du bist nach ${this.player.drinksConsumed} Runden vom Hocker gekippt! ${this.opponent.name} triumphiert am Tresen.`
      };
    }

    if (opponentResult.isKO) {
      this.roundActive = false;
      const payout = this.currentBet * 2;
      return {
        playerResult,
        opponentResult,
        winner: 'player',
        payout,
        message: `🏆 SIEG AM TRESEN! ${this.opponent.name} liegt bewusstlos unterm Hocker! Du streichst 💰 ${payout} Coins Gewinn ein!`
      };
    }

    return {
      playerResult,
      opponentResult,
      payout: 0,
      message: `Runde überstanden! Du hast noch ${this.player.energy}% Energie, ${this.opponent.name} hat noch ${this.opponent.energy}%. Nächste Runde!`
    };
  }
}
