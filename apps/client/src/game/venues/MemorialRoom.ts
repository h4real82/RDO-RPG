import { VenueDialog, text } from './VenueDialog';
import { WalletService, formatCoins } from '../economy/WalletService';
import { LocalAccountStore } from '../economy/LocalAccountStore';
import {
  MemorialStore,
  type MemoryNote,
  type ExhibitedTrophy,
  type NoteColor,
  MEMORIAL_CHANGED_EVENT
} from './MemorialStore';
import './Venues.css';

export class MemorialRoom {
  private activeTab: 'notes' | 'trophies' = 'notes';
  private selectedColor: NoteColor = 'gelb';
  private dialog?: VenueDialog;
  private abortController?: AbortController;

  constructor(private changed: () => void = () => {}) {}

  get isOpen(): boolean {
    return Boolean(this.dialog?.isOpen);
  }

  open(parent: HTMLElement): VenueDialog {
    this.close();

    const abort = (this.abortController = new AbortController());
    const dialog = new VenueDialog(parent, 'Erinnerungsraum & Trophäen-Lounge', () => {
      this.close();
    });
    this.dialog = dialog;
    dialog.panel.dataset.venue = 'memorial';

    const render = () => {
      dialog.content.replaceChildren();

      const profile = LocalAccountStore.getProfile();
      const currentBalance = WalletService.getSyncBalance();

      // Top Status Bar: Profile and Coins
      const headerBox = document.createElement('div');
      headerBox.className = 'rdo-venue__bar-header';
      dialog.content.append(headerBox);

      const balPill = text('div', `💰 Dein Guthaben: ${formatCoins(currentBalance)} Coins`, headerBox);
      balPill.className = 'rdo-venue__balance-pill';

      const userPill = text('span', `👤 Outlaw: ${profile.displayName}`, headerBox);
      userPill.className = 'rdo-venue__drink-tag';
      userPill.style.marginLeft = '12px';

      text(
        'p',
        'Willkommen im Erinnerungsraum von Valentine! Hier hinterlassen die Troublemakers bleibende Notizen auf der Pinnwand und stellen stolz ihre Trophäen und Gewinne aus.',
        headerBox
      );

      // Tab Switcher
      const tabRow = document.createElement('div');
      tabRow.className = 'rdo-venue__categories';
      headerBox.append(tabRow);

      const notesCount = MemorialStore.getNotes().length;
      const trophiesCount = MemorialStore.getTrophies().length;

      const btnNotes = dialog.button(`📌 Notizwand (${notesCount})`, () => {
        this.activeTab = 'notes';
        render();
      }, tabRow);
      if (this.activeTab === 'notes') btnNotes.classList.add('rdo-venue__category--active');

      const btnTrophies = dialog.button(`🏆 Trophäen-Vitrine (${trophiesCount})`, () => {
        this.activeTab = 'trophies';
        render();
      }, tabRow);
      if (this.activeTab === 'trophies') btnTrophies.classList.add('rdo-venue__category--active');

      // Main Tab Content
      if (this.activeTab === 'notes') {
        this.renderNotesTab(dialog, render, profile.id);
      } else {
        this.renderTrophiesTab(dialog, render, profile);
      }
    };

    window.addEventListener(MEMORIAL_CHANGED_EVENT, () => {
      if (this.dialog?.isOpen) {
        render();
      }
    }, { signal: abort.signal });

    render();
    return dialog;
  }

  private renderNotesTab(dialog: VenueDialog, render: () => void, currentUserId: string): void {
    const section = document.createElement('div');
    section.className = 'rdo-memorial__notes-section';
    dialog.content.append(section);

    // New Note Creator
    const creator = document.createElement('div');
    creator.className = 'rdo-memorial__creator';
    section.append(creator);

    text('strong', '✍️ Neue Post-it Notiz anheften', creator);

    const textarea = document.createElement('textarea');
    textarea.className = 'rdo-memorial__textarea';
    textarea.placeholder = 'Schreibe eine Nachricht an deine Freunde oder die Bande …';
    textarea.maxLength = 280;
    creator.append(textarea);

    const colorRow = document.createElement('div');
    colorRow.className = 'rdo-memorial__colors';
    creator.append(colorRow);

    text('small', 'Papierfarbe:', colorRow);
    const colors: { id: NoteColor; label: string }[] = [
      { id: 'gelb', label: 'Gelb' },
      { id: 'rosa', label: 'Rosa' },
      { id: 'blau', label: 'Blau' },
      { id: 'gruen', label: 'Grün' },
      { id: 'pergament', label: 'Pergament' }
    ];

    for (const c of colors) {
      const colorBtn = dialog.button(c.label, () => {
        this.selectedColor = c.id;
        render();
      }, colorRow);
      colorBtn.className = `rdo-memorial__color-btn rdo-memorial__color-btn--${c.id}`;
      if (this.selectedColor === c.id) {
        colorBtn.classList.add('rdo-memorial__color-btn--active');
      }
    }

    dialog.button('📌 Notiz anpinnen', () => {
      const msg = textarea.value.trim();
      if (!msg) {
        dialog.status.textContent = 'Bitte zuerst einen Text eingeben.';
        return;
      }
      try {
        MemorialStore.addNote(msg, this.selectedColor);
        dialog.status.textContent = 'Post-it Notiz erfolgreich an die Pinnwand geheftet!';
        this.changed();
        render();
      } catch (err) {
        dialog.status.textContent = (err as Error).message;
      }
    }, creator);

    // Notes Corkboard Grid
    const boardTitle = text('h3', '📌 Angeheftete Notizen der Outlaws', section);
    boardTitle.style.marginTop = '20px';

    const board = document.createElement('div');
    board.className = 'rdo-memorial__board';
    section.append(board);

    const notes = MemorialStore.getNotes();
    if (notes.length === 0) {
      text('p', 'Noch keine Notizen vorhanden. Sei der Erste, der etwas anheftet!', board);
      return;
    }

    for (const note of notes) {
      const card = document.createElement('div');
      card.className = `rdo-memorial__note rdo-memorial__note--${note.color}`;
      board.append(card);

      const pin = document.createElement('div');
      pin.className = 'rdo-memorial__pin';
      card.append(pin);

      const header = document.createElement('div');
      header.className = 'rdo-memorial__note-header';
      card.append(header);

      const author = text('strong', note.authorName, header);
      author.className = 'rdo-memorial__note-author';

      const dateStr = new Date(note.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const date = text('span', dateStr, header);
      date.className = 'rdo-memorial__note-date';

      const content = text('p', note.content, card);
      content.className = 'rdo-memorial__note-text';

      if (note.authorId === currentUserId || note.authorId.startsWith('char-local')) {
        const delBtn = dialog.button('🗑️ Entfernen', () => {
          MemorialStore.removeNote(note.id);
          dialog.status.textContent = 'Notiz von der Pinnwand entfernt.';
          this.changed();
          render();
        }, card);
        delBtn.className = 'rdo-memorial__note-del-btn';
      }
    }
  }

  private renderTrophiesTab(
    dialog: VenueDialog,
    render: () => void,
    profile: ReturnType<typeof LocalAccountStore.getProfile>
  ): void {
    const section = document.createElement('div');
    section.className = 'rdo-memorial__trophies-section';
    dialog.content.append(section);

    // Exhibition Action from Inventory
    const invSection = document.createElement('div');
    invSection.className = 'rdo-memorial__creator';
    section.append(invSection);

    text('strong', '🎁 Eigenen Preis / Item in die Vitrine stellen', invSection);
    text(
      'p',
      'Items in der Vitrine werden für alle sichtbar ausgestellt. Um Vervielfältigung zu verhindern, wird das Item aus deiner Tasche in die Vitrine übertragen und kann jederzeit wieder abgeholt werden.',
      invSection
    );

    const eligibleItems = profile.inventory.filter((i) => i.quantity > 0);

    if (eligibleItems.length === 0) {
      text('small', 'Du hast derzeit keine Items in deinem Inventar, die ausgestellt werden können.', invSection);
    } else {
      const selectBox = document.createElement('div');
      selectBox.style.display = 'flex';
      selectBox.style.flexWrap = 'wrap';
      selectBox.style.gap = '8px';
      selectBox.style.margin = '8px 0';
      invSection.append(selectBox);

      let selectedItemId = eligibleItems[0].itemId;

      for (const item of eligibleItems) {
        const itemName = item.itemId === 'potion_red' ? 'Roter Elixier-Flakon (Tapferkeit)' : item.itemId;
        const itemBtn = dialog.button(`${itemName} (${item.quantity}x)`, () => {
          selectedItemId = item.itemId;
          dialog.status.textContent = `${itemName} zur Ausstellung ausgewählt.`;
        }, selectBox);
        itemBtn.className = 'rdo-cinema__seat-btn';
      }

      const plaqueInput = dialog.input('Gravur / Widmung auf der Plakette:', 'text', `Gestiftet von ${profile.displayName}`);
      plaqueInput.maxLength = 120;

      dialog.button('🏆 Ausstellen & Plakette befestigen', () => {
        try {
          const plaque = plaqueInput.value.trim() || `Gestiftet von ${profile.displayName}`;
          MemorialStore.exhibitItem(selectedItemId, plaque);
          dialog.status.textContent = 'Item erfolgreich in die Vitrine gestellt!';
          this.changed();
          render();
        } catch (err) {
          dialog.status.textContent = (err as Error).message;
        }
      }, invSection);
    }

    // Showcase Display
    const showcaseTitle = text('h3', '🏆 Die Vitrine der Troublemakers', section);
    showcaseTitle.style.marginTop = '24px';

    const showcase = document.createElement('div');
    showcase.className = 'rdo-trophy__case';
    section.append(showcase);

    const trophies = MemorialStore.getTrophies();
    if (trophies.length === 0) {
      text('p', 'Die Vitrine ist derzeit leer.', showcase);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'rdo-trophy__grid';
    showcase.append(grid);

    for (const trophy of trophies) {
      const card = document.createElement('div');
      card.className = 'rdo-trophy__card';
      grid.append(card);

      const iconBox = document.createElement('div');
      iconBox.className = 'rdo-trophy__icon-box';
      iconBox.textContent = trophy.icon;
      card.append(iconBox);

      const title = text('strong', trophy.title, card);
      title.className = 'rdo-trophy__title';

      const desc = text('p', trophy.description, card);
      desc.className = 'rdo-trophy__desc';

      const plaque = document.createElement('div');
      plaque.className = 'rdo-trophy__plaque';
      card.append(plaque);
      text('small', `📜 ${trophy.plaque}`, plaque);

      const footer = document.createElement('div');
      footer.className = 'rdo-trophy__footer';
      card.append(footer);

      const val = text('span', `Wert: 💰 ${trophy.coinValue} Coins`, footer);
      val.className = 'rdo-venue__drink-price';

      // Reclaim option if placed by player
      if (trophy.authorId === profile.id || trophy.authorId.startsWith('char-local')) {
        const reclaimBtn = dialog.button('🎒 Zurück ins Inventar', () => {
          MemorialStore.reclaimTrophy(trophy.id);
          dialog.status.textContent = `„${trophy.title}“ wurde wieder in dein Inventar gelegt.`;
          this.changed();
          render();
        }, footer);
        reclaimBtn.className = 'rdo-venue__drink-tag';
        reclaimBtn.style.cursor = 'pointer';
      }
    }
  }

  close(): void {
    this.abortController?.abort();
    this.abortController = undefined;
    this.dialog?.close();
    this.dialog = undefined;
  }

  dispose(): void {
    this.close();
  }
}

