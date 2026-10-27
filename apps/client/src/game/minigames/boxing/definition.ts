import { VenueDialog, text } from '../../venues/VenueDialog';
import type { Venue } from '../types';
import { executeAttack, type Fighter } from './BoxingRules';

export function create(parent: HTMLElement, _variant: unknown, _venue: Venue) {
  let dialog: VenueDialog | undefined;
  let player: Fighter = { hp: 100, stamina: 100, isGuarding: false, knockdowns: 0 };
  let opponent: Fighter = { hp: 100, stamina: 100, isGuarding: false, knockdowns: 0 };

  const draw = () => {
    if (!dialog) return;
    const d = dialog;
    d.content.replaceChildren();

    text('p', 'Saloon Boxen · Runde gegen den Champion des Smithfields Saloons!', d.content);
    text('h3', `Du: ${player.hp} HP (Ausdauer: ${player.stamina}) · Gegner: ${opponent.hp} HP`, d.content);

    d.button('Linker Jab (Schnell)', () => {
      const res = executeAttack(player, opponent, 'jab');
      player = res.attacker;
      opponent = res.defender;
      d.status.textContent = `Treffer mit Jab! -${res.damage} HP`;
      draw();
    });

    d.button('Rechter Haken (Schwer)', () => {
      const res = executeAttack(player, opponent, 'cross');
      player = res.attacker;
      opponent = res.defender;
      d.status.textContent = `Schwerer Treffer! -${res.damage} HP`;
      draw();
    });

    d.button(player.isGuarding ? 'Deckung senken' : 'Doppeldeckung (Blocken)', () => {
      player.isGuarding = !player.isGuarding;
      draw();
    });
  };

  return {
    get isOpen() {
      return Boolean(dialog?.isOpen);
    },
    open() {
      dialog = new VenueDialog(parent, 'Saloon Faustkampf');
      draw();
    },
    dispose() {
      dialog?.close();
      dialog = undefined;
    },
  };
}

