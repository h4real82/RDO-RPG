import { MusicPlayer } from './MusicPlayer';
import { VenueDialog, text } from './VenueDialog';
import { BankDesk } from './BankDesk';
import { SaloonBar } from './SaloonBar';
import { CinemaPlayer } from './CinemaPlayer';
import { MemorialRoom } from './MemorialRoom';

export class VenueActivities {
  private dialog?: VenueDialog;
  private bank: BankDesk;
  private bar: SaloonBar;
  private cinema: CinemaPlayer;
  private memorial: MemorialRoom;
  private music: MusicPlayer;
  private saloon = false;

  constructor(
    private parent: HTMLElement,
    changed: () => void = () => {},
    onMusicExpand: () => void = () => {}
  ) {
    this.bank = new BankDesk(changed);
    this.bar = new SaloonBar(changed);
    this.cinema = new CinemaPlayer(parent, changed);
    this.memorial = new MemorialRoom(changed);
    this.music = new MusicPlayer(parent, () => {
      this.dialog?.close();
      this.dialog = undefined;
      onMusicExpand();
    });
  }

  get isOpen() {
    return Boolean(this.dialog?.isOpen) || this.music.isOpen || this.cinema.isOpen || this.memorial.isOpen;
  }

  supports(kind?: string) {
    return (
      kind === 'music' ||
      kind === 'drinks' ||
      kind === 'bank' ||
      kind === 'cinema' ||
      kind === 'theater' ||
      kind === 'memorial' ||
      kind === 'trophy'
    );
  }

  open(kind?: string) {
    this.close();
    if (kind === 'music') {
      this.music.open();
      return;
    }
    if (kind === 'cinema' || kind === 'theater') {
      this.dialog = this.cinema.open(this.parent);
      return;
    }
    if (kind === 'memorial' || kind === 'trophy') {
      this.dialog = this.memorial.open(this.parent);
      return;
    }
    if (kind === 'bank') {
      this.dialog = this.bank.open(this.parent);
      return;
    }
    if (kind === 'drinks') {
      this.dialog = this.bar.open(this.parent);
      return;
    }
    const d = (this.dialog = new VenueDialog(this.parent, 'Interaktion'));
    d.panel.dataset.venue = kind ?? 'unknown';
    text('p', 'Diese Interaktion ist derzeit nicht verfügbar.', d.content);
  }

  setBuilding(id?: string) {
    const inside = id === 'smithfields-saloon';
    if (this.saloon && !inside) {
      this.music.stop();
      this.close();
    }
    this.saloon = inside;
  }

  setSystemPaused(paused: boolean) {
    this.music.setSystemPaused(paused);
    if (paused) {
      this.cinema.stop();
      this.memorial.close();
    }
  }

  close() {
    this.dialog?.close();
    this.dialog = undefined;
    this.cinema.stop();
    this.memorial.close();
    this.music.collapse();
  }

  dispose() {
    this.close();
    this.music.dispose();
    this.bank.dispose();
    this.bar.dispose();
    this.cinema.dispose();
    this.memorial.dispose();
  }
}
