import { VenueDialog, text } from '../../venues/VenueDialog';
import type { Venue } from '../types';
import { isCardPlayable, type UnoCard } from './ColorCardsRules';

export function create(parent: HTMLElement, _variant: unknown, _venue: Venue) {
  let dialog: VenueDialog | undefined;
  const topCard: UnoCard = { id: 'top', color: 'gold', type: 'number', value: 7 };
  const hand: UnoCard[] = [
    { id: 'c1', color: 'gold', type: 'number', value: 3 },
    { id: 'c2', color: 'red', type: 'reverse' },
    { id: 'c3', color: 'wild', type: 'wild' },
  ];

  const draw = () => {
    if (!dialog) return;
    const d = dialog;
    d.content.replaceChildren();

    text('p', 'Western UNO · Lege passende Farben oder Zahlen ab.', d.content);
    text('h3', `Ablagestapel: ${topCard.color.toUpperCase()} ${topCard.value ?? topCard.type}`, d.content);

    for (const card of hand) {
      const playable = isCardPlayable(card, topCard, topCard.color);
      d.button(`${card.color} ${card.type === 'number' ? card.value : card.type}${playable ? ' (Spielbar)' : ''}`, () => {
        if (playable) {
          d.status.textContent = `Karte gelegt: ${card.color} ${card.value ?? card.type}`;
        } else {
          d.status.textContent = 'Diese Karte passt nicht!';
        }
      });
    }

    d.button('Karte ziehen', () => {
      d.status.textContent = 'Du hast eine Straf-/Ersatzkarte gezogen.';
    });
  };

  return {
    get isOpen() {
      return Boolean(dialog?.isOpen);
    },
    open() {
      dialog = new VenueDialog(parent, 'Western UNO Saloon');
      draw();
    },
    dispose() {
      dialog?.close();
      dialog = undefined;
    },
  };
}

