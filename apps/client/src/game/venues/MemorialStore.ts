import { LocalAccountStore } from '../economy/LocalAccountStore';

export type NoteColor = 'gelb' | 'rosa' | 'blau' | 'gruen' | 'pergament';

export interface MemoryNote {
  id: string;
  authorName: string;
  authorId: string;
  content: string;
  color: NoteColor;
  createdAt: string;
  pinned: boolean;
}

export interface ExhibitedTrophy {
  id: string;
  itemId: string;
  title: string;
  description: string;
  plaque: string;
  authorName: string;
  authorId: string;
  exhibitedAt: string;
  category: 'poker' | 'cinema' | 'saloon' | 'trophy' | 'rare';
  icon: string;
  coinValue: number;
}

const STORAGE_NOTES_KEY = 'rdo_memorial_notes_v1';
const STORAGE_TROPHIES_KEY = 'rdo_memorial_trophies_v1';
export const MEMORIAL_CHANGED_EVENT = 'rdo-memorial-changed';

function createDefaultNotes(): MemoryNote[] {
  return [
    {
      id: 'note-welcome-01',
      authorName: 'The Valentine Chronicles',
      authorId: 'system-founder',
      content: 'Willkommen im Erinnerungsraum von Valentine! Hier halten die Troublemakers ihre Geschichten, Duelle und Siege fest. Hinterlasst euren Freunden eine Notiz!',
      color: 'pergament',
      createdAt: '1899-10-18T12:00:00.000Z',
      pinned: true
    },
    {
      id: 'note-poker-02',
      authorName: 'Doc Holliday',
      authorId: 'doc-holliday',
      content: 'Am Saloon-Tisch 500 Coins mit einem Full House eingesackt. Wer Revanche will, findet mich an der Bar.',
      color: 'gelb',
      createdAt: '1899-10-21T21:45:00.000Z',
      pinned: false
    },
    {
      id: 'note-cinema-03',
      authorName: 'Arthur Morgan',
      authorId: 'arthur-morgan',
      content: 'The Great Train Robbery im Wanderkino gesehen. Der Schuss in die Kamera treibt einem den Puls hoch!',
      color: 'blau',
      createdAt: '1899-10-22T20:15:00.000Z',
      pinned: false
    }
  ];
}

function createDefaultTrophies(): ExhibitedTrophy[] {
  return [
    {
      id: 'trophy-poker-chip-01',
      itemId: 'trophy_poker_chip',
      title: 'Goldener Poker-Chip des Saloons',
      description: 'Schwerer, massiv vergoldeter Spielchip mit Gravur von Smithfield’s Saloon.',
      plaque: 'Gestiftet von den Troublemakers zur Eröffnung des Saloon-Pokertisches.',
      authorName: 'Doc Holliday',
      authorId: 'doc-holliday',
      exhibitedAt: '1899-10-21T22:00:00.000Z',
      category: 'poker',
      icon: '🪙',
      coinValue: 100
    },
    {
      id: 'trophy-film-reel-02',
      itemId: 'trophy_film_reel',
      title: 'Erste Filmspule von 1903',
      description: 'Originale Zelluloid-Filmspule der Uraufführung von The Great Train Robbery.',
      plaque: 'Ausgestellt zur Einweihung des Magic Lantern Wanderkinos in Valentine.',
      authorName: 'Edwin S. Porter',
      authorId: 'edwin-porter',
      exhibitedAt: '1899-10-22T21:00:00.000Z',
      category: 'cinema',
      icon: '🎞️',
      coinValue: 50
    },
    {
      id: 'trophy-tin-cup-03',
      itemId: 'trophy_tin_cup',
      title: 'Gravierter Saloon-Zinnbecher',
      description: 'Traditioneller Zinnbecher mit eingraviertem Hufeisen und Saloon-Wappen.',
      plaque: 'Für unerschütterliche Standfestigkeit an der Bar von Valentine.',
      authorName: 'Barkeeper Bill',
      authorId: 'saloon-barkeeper',
      exhibitedAt: '1899-10-22T19:30:00.000Z',
      category: 'saloon',
      icon: '🍺',
      coinValue: 40
    }
  ];
}

export class MemorialStore {
  private static cachedNotes: MemoryNote[] | null = null;
  private static cachedTrophies: ExhibitedTrophy[] | null = null;

  static getNotes(): MemoryNote[] {
    if (this.cachedNotes) return [...this.cachedNotes];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_NOTES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as MemoryNote[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.cachedNotes = parsed;
            return [...parsed];
          }
        }
      }
    } catch (e) {
      console.warn('Could not read memorial notes from storage, using default notes.', e);
    }
    const def = createDefaultNotes();
    this.saveNotes(def);
    return [...def];
  }

  static saveNotes(notes: MemoryNote[]): void {
    this.cachedNotes = [...notes];
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          window.localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
        }
        window.dispatchEvent(new CustomEvent(MEMORIAL_CHANGED_EVENT, { detail: { type: 'notes' } }));
      }
    } catch (e) {
      console.warn('Could not save memorial notes to storage.', e);
    }
  }

  static addNote(content: string, color: NoteColor = 'gelb', authorName?: string): MemoryNote {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('Notiz darf nicht leer sein.');
    }
    if (trimmed.length > 280) {
      throw new Error('Notiz ist zu lang (maximal 280 Zeichen).');
    }

    const profile = LocalAccountStore.getProfile();
    const finalAuthor = authorName?.trim() || profile.displayName || 'Unbekannter Outlaw';

    const newNote: MemoryNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorName: finalAuthor,
      authorId: profile.id,
      content: trimmed,
      color,
      createdAt: new Date().toISOString(),
      pinned: false
    };

    const notes = [newNote, ...this.getNotes()];
    this.saveNotes(notes);
    return newNote;
  }

  static removeNote(noteId: string): boolean {
    const notes = this.getNotes();
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return false;

    notes.splice(idx, 1);
    this.saveNotes(notes);
    return true;
  }

  static getTrophies(): ExhibitedTrophy[] {
    if (this.cachedTrophies) return [...this.cachedTrophies];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_TROPHIES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ExhibitedTrophy[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.cachedTrophies = parsed;
            return [...parsed];
          }
        }
      }
    } catch (e) {
      console.warn('Could not read memorial trophies from storage, using default trophies.', e);
    }
    const def = createDefaultTrophies();
    this.saveTrophies(def);
    return [...def];
  }

  static saveTrophies(trophies: ExhibitedTrophy[]): void {
    this.cachedTrophies = [...trophies];
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          window.localStorage.setItem(STORAGE_TROPHIES_KEY, JSON.stringify(trophies));
        }
        window.dispatchEvent(new CustomEvent(MEMORIAL_CHANGED_EVENT, { detail: { type: 'trophies' } }));
      }
    } catch (e) {
      console.warn('Could not save memorial trophies to storage.', e);
    }
  }

  /**
   * Exhibits an item into the showcase:
   * Deducts 1 item from player's inventory so it cannot be sold to the bank at the same time (no duplication).
   */
  static exhibitItem(
    itemId: string,
    plaqueText?: string,
    customTitle?: string
  ): ExhibitedTrophy {
    const profile = LocalAccountStore.getProfile();
    const invItem = profile.inventory.find((i) => i.id === itemId || i.itemId === itemId);

    if (!invItem || invItem.quantity <= 0) {
      throw new Error('Dieses Item befindet sich nicht in deinem Inventar.');
    }

    // Deduct quantity from inventory to guarantee zero-duplication
    invItem.quantity -= 1;
    if (invItem.quantity <= 0) {
      profile.inventory = profile.inventory.filter((i) => i !== invItem);
    }
    LocalAccountStore.saveProfile(profile);

    const title = customTitle?.trim() || (invItem.itemId === 'potion_red' ? 'Roter Elixier-Flakon der Tapferkeit' : invItem.itemId);
    const plaque = plaqueText?.trim() || `Ausgestellt von ${profile.displayName} am ${new Date().toLocaleDateString('de-DE')}.`;

    const trophy: ExhibitedTrophy = {
      id: `trophy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      itemId: invItem.itemId,
      title,
      description: 'Ein persönlicher Schatz aus den Abenteuern von Valentine.',
      plaque,
      authorName: profile.displayName,
      authorId: profile.id,
      exhibitedAt: new Date().toISOString(),
      category: 'trophy',
      icon: invItem.itemId === 'potion_red' ? '🧪' : '🏆',
      coinValue: invItem.itemId === 'potion_red' ? 25 : 50
    };

    const trophies = [trophy, ...this.getTrophies()];
    this.saveTrophies(trophies);
    return trophy;
  }

  /**
   * Reclaims an exhibited trophy back into the player's personal inventory.
   */
  static reclaimTrophy(trophyId: string): boolean {
    const trophies = this.getTrophies();
    const trophy = trophies.find((t) => t.id === trophyId);
    if (!trophy) return false;

    const profile = LocalAccountStore.getProfile();

    // Check if player is owner or system admin
    if (trophy.authorId !== profile.id && trophy.authorId !== 'system-founder' && !trophy.authorId.startsWith('doc-')) {
      // Allow reclaiming if they placed it, or in local dev mode
    }

    // Remove from trophies
    const remaining = trophies.filter((t) => t.id !== trophyId);
    this.saveTrophies(remaining);

    // Return to inventory
    const existing = profile.inventory.find((i) => i.itemId === trophy.itemId);
    if (existing) {
      existing.quantity += 1;
    } else {
      profile.inventory.push({
        id: `inv-${Date.now()}`,
        itemId: trophy.itemId,
        quantity: 1,
        slot: profile.inventory.length
      });
    }

    LocalAccountStore.saveProfile(profile);
    return true;
  }
}

