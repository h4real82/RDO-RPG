// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemorialStore,
  type MemoryNote,
  type ExhibitedTrophy
} from './MemorialStore';
import { MemorialRoom } from './MemorialRoom';
import { LocalAccountStore, createDefaultGuestProfile } from '../economy/LocalAccountStore';
import { WalletService } from '../economy/WalletService';

describe('Erinnerungsraum Post-it Pinnwand (H4R-80)', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);
    // Reset notes in store
    MemorialStore.saveNotes([
      {
        id: 'test-note-01',
        authorName: 'Doc Holliday',
        authorId: 'doc-holliday',
        content: 'Erste Testnotiz an der Pinnwand.',
        color: 'gelb',
        createdAt: new Date().toISOString(),
        pinned: false
      }
    ]);
  });

  it('retrieves notes with stable author and timestamp metadata', () => {
    const notes = MemorialStore.getNotes();
    expect(notes.length).toBeGreaterThanOrEqual(1);

    const docNote = notes.find((n) => n.id === 'test-note-01');
    expect(docNote).toBeDefined();
    expect(docNote?.authorName).toBe('Doc Holliday');
    expect(docNote?.color).toBe('gelb');
  });

  it('adds a new sticky note with color and author info', () => {
    const newNote = MemorialStore.addNote('Treffen wir uns am Saloon-Klavier um 20 Uhr!', 'blau', 'Arthur');
    expect(newNote.id).toBeDefined();
    expect(newNote.authorName).toBe('Arthur');
    expect(newNote.content).toBe('Treffen wir uns am Saloon-Klavier um 20 Uhr!');
    expect(newNote.color).toBe('blau');

    const allNotes = MemorialStore.getNotes();
    expect(allNotes.map((n) => n.id)).toContain(newNote.id);
  });

  it('rejects empty notes or notes exceeding length limit', () => {
    expect(() => MemorialStore.addNote('')).toThrow('Notiz darf nicht leer sein.');
    expect(() => MemorialStore.addNote(' '.repeat(10))).toThrow('Notiz darf nicht leer sein.');

    const longText = 'a'.repeat(300);
    expect(() => MemorialStore.addNote(longText)).toThrow('maximal 280 Zeichen');
  });

  it('removes a note by ID', () => {
    const note = MemorialStore.addNote('Kurzlebige Notiz', 'rosa');
    expect(MemorialStore.getNotes().some((n) => n.id === note.id)).toBe(true);

    const removed = MemorialStore.removeNote(note.id);
    expect(removed).toBe(true);
    expect(MemorialStore.getNotes().some((n) => n.id === note.id)).toBe(false);
  });
});

describe('Erinnerungsraum Trophäen-Vitrine & Anti-Duplikation (H4R-81)', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);
  });

  it('contains default historic trophies in the showcase', () => {
    const trophies = MemorialStore.getTrophies();
    expect(trophies.length).toBeGreaterThanOrEqual(3);

    const pokerChip = trophies.find((t) => t.itemId === 'trophy_poker_chip');
    expect(pokerChip).toBeDefined();
    expect(pokerChip?.category).toBe('poker');
    expect(pokerChip?.coinValue).toBe(100);

    const filmReel = trophies.find((t) => t.itemId === 'trophy_film_reel');
    expect(filmReel).toBeDefined();
    expect(filmReel?.category).toBe('cinema');
  });

  it('exhibits an item from inventory, reducing inventory count to prevent double-spending', () => {
    const profile = LocalAccountStore.getProfile();
    const potion = profile.inventory.find((i) => i.itemId === 'potion_red');
    expect(potion).toBeDefined();
    expect(potion?.quantity).toBe(3);

    // Exhibit 1 potion into showcase
    const trophy = MemorialStore.exhibitItem('potion_red', 'Gewonnen beim Duell');
    expect(trophy.itemId).toBe('potion_red');
    expect(trophy.plaque).toBe('Gewonnen beim Duell');

    // Verify inventory was deducted so it cannot be sold to the bank simultaneously
    const updatedProfile = LocalAccountStore.getProfile();
    const updatedPotion = updatedProfile.inventory.find((i) => i.itemId === 'potion_red');
    expect(updatedPotion?.quantity).toBe(2);

    // Trophy is now in showcase
    expect(MemorialStore.getTrophies().some((t) => t.id === trophy.id)).toBe(true);
  });

  it('reclaims an exhibited trophy back into the personal inventory', () => {
    const trophy = MemorialStore.exhibitItem('potion_red', 'Meine Siegestrophäe');
    const balBefore = LocalAccountStore.getProfile().inventory.find((i) => i.itemId === 'potion_red')?.quantity ?? 0;

    const reclaimed = MemorialStore.reclaimTrophy(trophy.id);
    expect(reclaimed).toBe(true);

    // No longer in showcase
    expect(MemorialStore.getTrophies().some((t) => t.id === trophy.id)).toBe(false);

    // Inventory incremented back
    const balAfter = LocalAccountStore.getProfile().inventory.find((i) => i.itemId === 'potion_red')?.quantity ?? 0;
    expect(balAfter).toBe(balBefore + 1);
  });

  it('prevents exhibiting items not present in inventory', () => {
    expect(() => MemorialStore.exhibitItem('non_existent_item')).toThrow(
      'Dieses Item befindet sich nicht in deinem Inventar.'
    );
  });
});

describe('MemorialRoom Component & UI Interaction (H4R-80 & H4R-81)', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);
  });

  it('opens and closes the memorial venue dialog with tabs', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const room = new MemorialRoom();
    expect(room.isOpen).toBe(false);

    const dialog = room.open(container);
    expect(room.isOpen).toBe(true);
    expect(dialog.panel.dataset.venue).toBe('memorial');

    // Renders corkboard and note creator
    expect(container.querySelector('.rdo-memorial__creator')).not.toBeNull();
    expect(container.querySelector('.rdo-memorial__board')).not.toBeNull();

    room.dispose();
    expect(room.isOpen).toBe(false);
    expect(container.querySelector('.rdo-venue')).toBeNull();

    container.remove();
  });
});

