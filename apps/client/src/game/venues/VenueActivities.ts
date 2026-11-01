import { MusicPlayer } from './MusicPlayer';
import { VenueDialog, text } from './VenueDialog';
import { BankDesk } from './BankDesk';
import { SaloonBar } from './SaloonBar';
import { CinemaPlayer } from './CinemaPlayer';
import { MemorialRoom } from './MemorialRoom';
import { StationDesk } from './StationDesk';
import { ArtworkViewer } from './ArtworkViewer';
import { HotelGuestDialog } from './HotelGuestDialog';
import { TownNpcs } from '../npcs/TownNpcs';
import { CemeteryModal } from './CemeteryModal';
import { ShootingRangeModal } from '../gunplay/ShootingRangeModal';
import type{ScreenCorners}from'./CinemaScreen';

export class VenueActivities {
  private dialog?: VenueDialog;
  private bank: BankDesk;
  private bar: SaloonBar;
  private cinema: CinemaPlayer;
  private memorial: MemorialRoom;
  private music: MusicPlayer;
  private station: StationDesk;
  private artwork: ArtworkViewer;
  private hotelGuest: HotelGuestDialog;
  private townNpcs: TownNpcs;
  private cemetery: CemeteryModal;
  private shootingRange: ShootingRangeModal;
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
    this.station = new StationDesk(changed);
    this.artwork = new ArtworkViewer();
    this.cemetery = new CemeteryModal(parent, changed);
    this.shootingRange = new ShootingRangeModal(parent, changed);
    this.townNpcs = new TownNpcs(parent, {
      onChanged: changed,
      onOpenCemetery: () => this.open('cemetery'),
      onOpenShootingRange: () => this.open('shooting_range')
    });
    this.hotelGuest = new HotelGuestDialog(parent, {
      onChanged: changed,
      onWettsaufen: () => this.open('drinks')
    });
    this.music = new MusicPlayer(parent, () => {
      try {
        this.dialog?.close();
        this.dialog = undefined;
      } catch (err) {
        console.error('[VenueActivities] Error closing dialog on music expand:', err);
      }
      try {
        onMusicExpand();
      } catch (err) {
        console.error('[VenueActivities] Error in onMusicExpand callback:', err);
      }
    });
  }

  get isOpen() {
    return (
      Boolean(this.dialog?.isOpen) ||
      this.music.isOpen ||
      this.cinema.isOpen ||
      this.memorial.isOpen ||
      this.artwork.isOpen ||
      this.hotelGuest.isOpen ||
      this.townNpcs.isOpen ||
      this.cemetery.isOpen ||
      this.shootingRange.isOpen
    );
  }

  supports(kind?: string) {
    return (
      kind === 'music' ||
      kind === 'drinks' ||
      kind === 'bank' ||
      kind === 'cinema' ||
      kind === 'theater' ||
      kind === 'memorial' ||
      kind === 'trophy' ||
      kind === 'station' ||
      kind === 'station_master' ||
      kind === 'station_info' ||
      kind === 'artwork' ||
      kind === 'picture' ||
      kind === 'sit' ||
      kind === 'talk' ||
      kind === 'hotel_guest' ||
      kind === 'hotel_lady' ||
      kind === 'inspect' ||
      kind === 'read' ||
      kind === 'sheriff' ||
      kind === 'reverend' ||
      kind === 'doctor' ||
      kind === 'gunsmith' ||
      kind === 'cemetery' ||
      kind === 'shooting_range'
    );
  }

  open(kind?: string) {
    this.close(kind !== 'cinema' && kind !== 'theater');
    try {
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
      if (kind === 'artwork' || kind === 'picture') {
        this.dialog = this.artwork.open(this.parent);
        return;
      }
      if (kind === 'station' || kind === 'station_master' || kind === 'station_info') {
        this.dialog = this.station.open(this.parent, kind);
        return;
      }
      if (kind === 'sit') {
        const d = (this.dialog = new VenueDialog(this.parent, 'Ausruhen & Hinsetzen'));
        d.panel.dataset.venue = 'sit';
        text('p', 'Du nimmst Platz und gönnst deinen Stiefeln eine Pause. In der ruhigen Atmosphäre regenerieren sich Vitalität und Ausdauer langsam.', d.content);
        const btn = d.button('Aufstehen & Weitergehen', () => this.close());
        btn.className = 'rdo-venue__order-btn';
        return;
      }
      if (kind === 'inspect' || kind === 'read') {
        const d = (this.dialog = new VenueDialog(this.parent, 'Valentine Daily Mail & Anschläge'));
        d.panel.dataset.venue = kind;
        text('p', 'Aktuelle Ausgabe des Valentine Daily Mail (1899) und lokale Bekanntmachungen:', d.content);
        const news = document.createElement('div');
        news.style.display = 'flex';
        news.style.flexDirection = 'column';
        news.style.gap = '10px';
        news.style.margin = '12px 0';
        news.innerHTML = `
          <div style="background:rgba(212,175,55,0.08); padding:10px 14px; border-left:3px solid #d4af37; border-radius:4px;">
            <b style="color:#ebdcb9;">🐂 Rekordpreise bei der Valentine Viehauktion</b>
            <div style="font-size:12px; color:#c5b8a5; margin-top:4px;">Die Nachfrage nach Fleisch in den Städten des Ostens treibt die Rinderpreise weiter an. Farmer aus Cumberland Falls und den Heartlands treiben große Herden ein.</div>
          </div>
          <div style="background:rgba(212,175,55,0.08); padding:10px 14px; border-left:3px solid #d4af37; border-radius:4px;">
            <b style="color:#ebdcb9;">❄️ Wetterwarnung: Schneestürme in den Grizzlies</b>
            <div style="font-size:12px; color:#c5b8a5; margin-top:4px;">Tiefdruckgebiete bringen schwere Schneefälle am Mount Hagen. Reisende nach Ambarino werden dringend vor plötzlichen Schneeverwehungen gewarnt.</div>
          </div>
          <div style="background:rgba(212,175,55,0.08); padding:10px 14px; border-left:3px solid #d4af37; border-radius:4px;">
            <b style="color:#ebdcb9;">🔍 Pinkerton Detective Agency Steckbriefe</b>
            <div style="font-size:12px; color:#c5b8a5; margin-top:4px;">Gesucht: Gesetzlose der Van-der-Linde-Bande nach Zugüberfällen in New Hanover. Belohnungen beim örtlichen Sheriff erhältlich.</div>
          </div>
        `;
        d.content.append(news);
        const btn = d.button('Zeitung weglegen', () => this.close());
        btn.className = 'rdo-venue__order-btn';
        return;
      }
      if (kind === 'hotel_guest' || kind === 'hotel_lady') {
        this.dialog = this.hotelGuest.open(this.parent);
        return;
      }
      if (kind === 'sheriff') {
        this.dialog = this.townNpcs.openSheriff();
        return;
      }
      if (kind === 'reverend') {
        this.dialog = this.townNpcs.openReverend();
        return;
      }
      if (kind === 'doctor') {
        this.dialog = this.townNpcs.openDoctor();
        return;
      }
      if (kind === 'gunsmith') {
        this.dialog = this.townNpcs.openGunsmith();
        return;
      }
      if (kind === 'cemetery') {
        this.dialog = this.cemetery.open();
        return;
      }
      if (kind === 'shooting_range') {
        this.dialog = this.shootingRange.open();
        return;
      }
      if (kind === 'talk') {
        const d = (this.dialog = new VenueDialog(this.parent, 'Gespräch mit Ortsansässigen'));
        d.panel.dataset.venue = 'talk';
        text('p', '„Guten Tag, Fremder! Pass auf deinen Geldbeutel auf, wenn du in Smithfield’s Saloon einkehrst. Manche Kartenspieler dort haben mehr Asse im Ärmel als im Deck. Und wenn du Arbeit suchst: Schau beim Sheriff oder am Bahnhof vorbei.“', d.content);
        const btn = d.button('Verabschieden', () => this.close());
        btn.className = 'rdo-venue__order-btn';
        return;
      }
      const d = (this.dialog = new VenueDialog(this.parent, 'Interaktion'));
      d.panel.dataset.venue = kind ?? 'unknown';
      text('p', 'Diese Interaktion ist derzeit nicht verfügbar.', d.content);
    } catch (err) {
      console.error('[VenueActivities] Error opening venue activity:', err);
      this.close();
    }
  }

  setBuilding(id?: string) {
    try {
      this.cinema.setScreenActive(id === 'val-07-magiclantern-ext');
      const inside = id === 'smithfields-saloon';
      if (this.saloon && !inside) {
        this.music.stop();
        this.close();
      }
      this.saloon = inside;
    } catch (err) {
      console.error('[VenueActivities] Error updating building context:', err);
    }
  }

  setSystemPaused(paused: boolean) {
    try {
      this.music.setSystemPaused(paused);
      if (paused) {
        this.cinema.stop();
        this.memorial.close();
      }
    } catch (err) {
      console.error('[VenueActivities] Error updating system paused state:', err);
    }
  }

  get cinemaProjecting() { return this.cinema.projecting; }
  updateCinemaProjection(corners?: ScreenCorners) {
    try {
      this.cinema.updateProjection(corners);
    } catch (err) {
      console.error('[VenueActivities] Error updating cinema projection:', err);
    }
  }

  close(stopCinema = true) {
    try {
      this.dialog?.close();
    } catch (err) {
      console.error('[VenueActivities] Error closing dialog:', err);
    }
    this.dialog = undefined;
    if (stopCinema) {
      try {
        this.cinema.stop();
      } catch (err) {
        console.error('[VenueActivities] Error stopping cinema:', err);
      }
    }
    try {
      this.memorial.close();
    } catch (err) {
      console.error('[VenueActivities] Error closing memorial:', err);
    }
    try {
      this.artwork.close();
    } catch (err) {
      console.error('[VenueActivities] Error closing artwork viewer:', err);
    }
    try {
      this.hotelGuest.close();
    } catch (err) {
      console.error('[VenueActivities] Error closing hotel guest dialog:', err);
    }
    try {
      this.townNpcs.close();
    } catch (err) {
      console.error('[VenueActivities] Error closing town NPCs:', err);
    }
    try {
      this.cemetery.close();
    } catch (err) {
      console.error('[VenueActivities] Error closing cemetery modal:', err);
    }
    try {
      this.shootingRange.close();
    } catch (err) {
      console.error('[VenueActivities] Error closing shooting range:', err);
    }
    try {
      this.music.collapse();
    } catch (err) {
      console.error('[VenueActivities] Error collapsing music:', err);
    }
  }

  dispose() {
    this.close();
    try { this.music.dispose(); } catch (err) { console.error('[VenueActivities] Error disposing music:', err); }
    try { this.bank.dispose(); } catch (err) { console.error('[VenueActivities] Error disposing bank:', err); }
    try { this.bar.dispose(); } catch (err) { console.error('[VenueActivities] Error disposing bar:', err); }
    try { this.cinema.dispose(); } catch (err) { console.error('[VenueActivities] Error disposing cinema:', err); }
    try { this.memorial.dispose(); } catch (err) { console.error('[VenueActivities] Error disposing memorial:', err); }
    try { this.station.dispose(); } catch (err) { console.error('[VenueActivities] Error disposing station:', err); }
    try { this.townNpcs.close(); } catch (err) { console.error('[VenueActivities] Error closing town NPCs:', err); }
    try { this.cemetery.close(); } catch (err) { console.error('[VenueActivities] Error closing cemetery modal:', err); }
    try { this.shootingRange.close(); } catch (err) { console.error('[VenueActivities] Error closing shooting range:', err); }
  }
}
