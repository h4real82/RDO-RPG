import { VenueDialog, text } from '../../venues/VenueDialog';
import type { Venue } from '../types';
import { CLUBS, type ClubType } from './GolfRules';

export function create(parent: HTMLElement, _variant: unknown, _venue: Venue) {
  let dialog: VenueDialog | undefined;
  let selectedClub: ClubType = 'driver';
  let strokes = 0;

  const draw = () => {
    if (!dialog) return;
    const d = dialog;
    d.content.replaceChildren();

    text('p', 'Valentine Cross Golf · Spiele quer durch den Ort bis zum Zielloch.', d.content);
    text('h3', `Gewählter Schläger: ${CLUBS[selectedClub].name} (Winkel: ${CLUBS[selectedClub].launchAngleDeg}°)`, d.content);
    text('p', `Bisherige Schläge: ${strokes}`, d.content);

    for (const key of Object.keys(CLUBS) as ClubType[]) {
      d.button(CLUBS[key].name, () => {
        selectedClub = key;
        draw();
      });
    }

    d.button('Abschlag (Testschwung)', () => {
      strokes++;
      d.status.textContent = `Schlag ausgeführt mit ${CLUBS[selectedClub].name}!`;
      draw();
    });
  };

  return {
    get isOpen() {
      return Boolean(dialog?.isOpen);
    },
    open() {
      dialog = new VenueDialog(parent, 'Cross Golf Valentine');
      draw();
    },
    dispose() {
      dialog?.close();
      dialog = undefined;
    },
  };
}

