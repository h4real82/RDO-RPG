export type Card = string;
const ranks = '23456789TJQKA';
const rankNames = ['2er', '3er', '4er', '5er', '6er', '7er', '8er', '9er', '10er', 'Buben', 'Damen', 'Könige', 'Assen'];
const names = ['High Card', 'Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'];

function five(cards: Card[]): number[] {
  const r = cards.map((c) => ranks.indexOf(c[0]) + 2).sort((a, b) => b - a);
  const flush = cards.every((c) => c[1] === cards[0][1]);
  const unique = [...new Set(r)];
  const straight = unique.length === 5 ? (r[0] - r[4] === 4 ? r[0] : r.join(',') === '14,5,4,3,2' ? 5 : 0) : 0;
  const groups = [...new Set(r)].map((v) => ({ v, n: r.filter((x) => x === v).length })).sort((a, b) => b.n - a.n || b.v - a.v);
  if (straight && flush) return [8, straight];
  if (groups[0].n === 4) return [7, ...groups.map((g) => g.v)];
  if (groups[0].n === 3 && groups[1].n === 2) return [6, ...groups.map((g) => g.v)];
  if (flush) return [5, ...r];
  if (straight) return [4, straight];
  return [groups[0].n === 3 ? 3 : groups[0].n === 2 ? (groups[1].n === 2 ? 2 : 1) : 0, ...groups.map((g) => g.v)];
}

const compare = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

export function rankHand(cards: Card[]) {
  if (cards.length < 5 || cards.length > 7 || new Set(cards).size !== cards.length || cards.some((c) => !/^([2-9TJQKA])[SHDC]$/.test(c))) {
    throw new Error('Ungültige Karten');
  }
  let best: number[] = [];
  for (let a = 0; a < cards.length - 4; a++) {
    for (let b = a + 1; b < cards.length - 3; b++) {
      for (let c = b + 1; c < cards.length - 2; c++) {
        for (let d = c + 1; d < cards.length - 1; d++) {
          for (let e = d + 1; e < cards.length; e++) {
            const hand = five([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (compare(hand, best) > 0) best = hand;
          }
        }
      }
    }
  }
  return { score: best, name: names[best[0]] };
}

export function compareHands(a: Card[], b: Card[]) {
  return compare(rankHand(a).score, rankHand(b).score);
}

export function evaluateCurrentHand(hole: Card[], community: Card[]): string {
  if (community.length === 0) {
    if (hole.length === 2) {
      if (hole[0][0] === hole[1][0]) {
        const idx = ranks.indexOf(hole[0][0]);
        return `Pocket-Paar (${rankNames[idx] ?? hole[0][0]})`;
      }
      const suited = hole[0][1] === hole[1][1];
      return `${hole[0][0]}-${hole[1][0]} ${suited ? 'suited' : 'offsuit'}`;
    }
    return '';
  }
  const all = [...hole, ...community];
  if (all.length >= 5) {
    return rankHand(all).name;
  }
  return '';
}

export function formatCard(card: string): { text: string; suit: string; red: boolean } {
  if (card === '??') return { text: '◆', suit: '◆', red: false };
  const rank = card[0];
  const suitChar = card[1];
  const suitMap: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const suit = suitMap[suitChar] ?? suitChar;
  const red = suitChar === 'H' || suitChar === 'D';
  return { text: rank + suit, suit, red };
}

export interface PokerVariant {
  gameId: 'poker';
  rulesVersion: 'valentine-holdem-practice-v1';
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
}

export const DEFAULT_POKER: PokerVariant = {
  gameId: 'poker',
  rulesVersion: 'valentine-holdem-practice-v1',
  startingChips: 100,
  smallBlind: 2,
  bigBlind: 4,
};

export function parsePokerVariant(value: unknown): PokerVariant {
  const v = value as PokerVariant;
  if (
    !v ||
    v.gameId !== 'poker' ||
    v.rulesVersion !== 'valentine-holdem-practice-v1' ||
    ![v.startingChips, v.smallBlind, v.bigBlind].every(Number.isSafeInteger) ||
    v.smallBlind < 1 ||
    v.bigBlind < v.smallBlind * 2 ||
    v.startingChips < v.bigBlind * 4 ||
    v.startingChips > 10000
  ) {
    throw new Error('Ungültige Poker-Übungsvariante');
  }
  return { ...v };
}

/** Heads-up exercise: catalog blinds/stacks, passive check/call bot; fresh chips per hand or carried stacks. */
export class PokerPractice {
  readonly player: Card[];
  readonly opponent: Card[];
  readonly board: Card[];
  readonly config: PokerVariant;
  stacks: number[];
  bets: number[];
  pot: number;
  street = 0;
  finished = false;
  result = '';

  constructor(
    random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
    variant: unknown = DEFAULT_POKER,
    customStacks?: [number, number]
  ) {
    this.config = parsePokerVariant(variant);
    const c = this.config;
    const initial = customStacks ? [customStacks[0], customStacks[1]] : [c.startingChips, c.startingChips];
    const sb = Math.min(c.smallBlind, initial[0]);
    const bb = Math.min(c.bigBlind, initial[1]);
    this.stacks = [initial[0] - sb, initial[1] - bb];
    this.bets = [sb, bb];
    this.pot = sb + bb;
    const deck = [...'SHDC'].flatMap((s) => [...ranks].map((r) => r + s));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.player = deck.slice(0, 2);
    this.opponent = deck.slice(2, 4);
    this.board = deck.slice(4, 9);
  }

  get toCall() {
    return this.bets[1] - this.bets[0];
  }

  act(action: 'fold' | 'call' | 'check' | 'raise', total?: number) {
    if (this.finished) throw new Error('Hand beendet');
    if (action === 'fold') {
      this.stacks[1] += this.pot;
      this.pot = 0;
      this.finished = true;
      this.result = 'Du passt. Der Übungspartner erhält den Pot.';
      return;
    }
    if (action === 'check' && this.toCall !== 0) throw new Error('Bitte den Blind mitgehen oder passen.');
    const target = action === 'raise' ? total! : this.bets[1];
    if (
      !Number.isSafeInteger(target) ||
      target < this.bets[1] ||
      target > this.stacks[0] + this.bets[0] ||
      (action === 'raise' && target < this.bets[1] + this.config.bigBlind && target !== this.stacks[0] + this.bets[0])
    ) {
      throw new Error(`Erhöhung mindestens ${this.config.bigBlind} Testchips; höchstens dein Stack.`);
    }
    const pay = target - this.bets[0];
    this.stacks[0] -= pay;
    this.pot += pay;
    this.bets[0] = target;
    const call = Math.min(target - this.bets[1], this.stacks[1]);
    this.stacks[1] -= call;
    this.pot += call;
    this.bets[1] += call;
    if (this.stacks[0] === 0 || this.stacks[1] === 0) this.street = 4;
    else this.street++;
    this.bets = [0, 0];
    if (this.street >= 4) {
      const result = compareHands([...this.player, ...this.board], [...this.opponent, ...this.board]);
      if (result === 0) {
        this.stacks[0] += Math.floor(this.pot / 2);
        this.stacks[1] += Math.ceil(this.pot / 2);
      } else {
        this.stacks[result > 0 ? 0 : 1] += this.pot;
      }
      this.result = result === 0 ? 'Geteilter Pot.' : result > 0 ? 'Du gewinnst den Pot.' : 'Der Übungspartner gewinnt den Pot.';
      this.result += ' Deine Hand: ' + rankHand([...this.player, ...this.board]).name + '.';
      this.pot = 0;
      this.finished = true;
    }
  }
}
