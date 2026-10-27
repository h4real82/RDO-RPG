import { VenueDialog, text } from './VenueDialog';
import { WalletService, formatCoins } from '../economy/WalletService';
import { observeYouTube, youtubeError } from './YouTubeBridge';
import './Venues.css';

export type CinemaSeat = 'Reihe 1 (Parkett Mitte)' | 'Reihe 2 (Parkett Hinten)' | 'Loge / Balkon (VIP)';

export const CINEMA_SEATS: readonly CinemaSeat[] = [
  'Reihe 1 (Parkett Mitte)',
  'Reihe 2 (Parkett Hinten)',
  'Loge / Balkon (VIP)'
];

export const TICKET_PRICE = 2;

export interface CinemaMovie {
  id: string;
  title: string;
  year: number;
  duration: string;
  director: string;
  url: string;
  description: string;
}

export const CINEMA_CATALOG: readonly CinemaMovie[] = [
  {
    id: 'great-train-robbery',
    title: 'The Great Train Robbery',
    year: 1903,
    duration: '11 Min.',
    director: 'Edwin S. Porter',
    url: 'https://www.youtube.com/watch?v=gmA6MrX81z4',
    description: 'Der allererste Western der Filmgeschichte: Ein spektakulärer Eisenbahnüberfall der Gesetzlosen im Wilden Westen mit dem legendären Schuss direkt in die Kamera.'
  },
  {
    id: 'trip-to-the-moon',
    title: 'A Trip to the Moon (Die Reise zum Mond)',
    year: 1902,
    duration: '13 Min.',
    director: 'Georges Méliès',
    url: 'https://www.youtube.com/watch?v=ZNAHcMMOHE8',
    description: 'Stummfilm-Monument von Georges Méliès: Eine Gruppe von Astronomen reist mit einer Kanonenkapsel zum Mond.'
  },
  {
    id: 'the-general',
    title: 'The General (Der General)',
    year: 1926,
    duration: '75 Min.',
    director: 'Buster Keaton & Clyde Bruckman',
    url: 'https://www.youtube.com/watch?v=iHlBMKcg8nU',
    description: 'Buster Keatons Stummfilm-Meisterwerk: Eine waghalsige Verfolgungsjagd auf den Schienen während des Eisenbahnzeitalters.'
  },
  {
    id: 'the-kid',
    title: 'The Kid',
    year: 1921,
    duration: '53 Min.',
    director: 'Charlie Chaplin',
    url: 'https://www.youtube.com/watch?v=52H33eS5aL4',
    description: 'Chaplins berührender Stummfilmklassiker über die Freundschaft zwischen dem Tramp und einem Waisenkind.'
  }
];

export type CinemaProvider = 'youtube' | 'direct';

export interface CinemaSource {
  provider: CinemaProvider;
  label: string;
  videoId?: string;
  canonicalUrl: string;
  embedUrl?: string;
  externalUrl?: string;
}

export function resolveCinemaSource(value: string, origin?: string): CinemaSource {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Bitte eine gültige Video-URL eingeben.');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Ungültiges URL-Format. Bitte eine vollständige HTTPS-Adresse eingeben.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Bitte eine HTTPS-Webadresse für das Video verwenden.');
  }

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  // YouTube Links
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(host)) {
    let id: string | null = null;
    if (host === 'youtu.be') {
      id = parts[0] ?? null;
    } else if (['embed', 'shorts', 'live'].includes(parts[0])) {
      id = parts[1] ?? null;
    } else {
      id = url.searchParams.get('v');
    }

    if (!id || !/^[-_a-zA-Z0-9]{11}$/.test(id)) {
      throw new Error('Dieser YouTube-Link enthält keine gültige 11-stellige Video-ID.');
    }

    const canonical = new URL('https://www.youtube.com/watch');
    canonical.searchParams.set('v', id);

    const embed = new URL(`https://www.youtube.com/embed/${id}`);
    embed.searchParams.set('enablejsapi', '1');
    embed.searchParams.set('playsinline', '1');
    embed.searchParams.set('autoplay', '1');
    embed.searchParams.set('rel', '0');

    if (origin) {
      try {
        const o = new URL(origin);
        if (['http:', 'https:'].includes(o.protocol)) {
          embed.searchParams.set('origin', o.origin);
        }
      } catch {
        // Ignore invalid origin
      }
    }

    return {
      provider: 'youtube',
      label: 'YouTube',
      videoId: id,
      canonicalUrl: canonical.href,
      embedUrl: embed.href,
      externalUrl: canonical.href
    };
  }

  // Direct video streams (mp4, webm, ogg, ogv)
  const pathname = url.pathname.toLowerCase();
  if (pathname.endsWith('.mp4') || pathname.endsWith('.webm') || pathname.endsWith('.ogg') || pathname.endsWith('.ogv')) {
    return {
      provider: 'direct',
      label: 'Direkter Videostream',
      canonicalUrl: url.href,
      externalUrl: url.href
    };
  }

  // Fallback: Generic direct HTTPS stream if requested
  return {
    provider: 'direct',
    label: 'Videostream',
    canonicalUrl: url.href,
    externalUrl: url.href
  };
}

export async function purchaseCinemaTicket(): Promise<{
  success: boolean;
  message: string;
  newBalance: bigint;
}> {
  const currentBalance = WalletService.getSyncBalance();
  if (currentBalance < BigInt(TICKET_PRICE)) {
    return {
      success: false,
      message: `Nicht genügend Coins! Du hast ${formatCoins(currentBalance)} Coins, eine Kinokarte kostet ${TICKET_PRICE} Coins.`,
      newBalance: currentBalance
    };
  }

  const reserved = await WalletService.reserveBet(TICKET_PRICE);
  if (!reserved) {
    return {
      success: false,
      message: 'Abbuchung für die Kinokarte fehlgeschlagen. Kontostand prüfen.',
      newBalance: WalletService.getSyncBalance()
    };
  }

  return {
    success: true,
    message: `Kinokarte gelöst (-${TICKET_PRICE} Coins). Gute Unterhaltung im Magic Lantern Wanderkino!`,
    newBalance: WalletService.getSyncBalance()
  };
}

export class CinemaPlayer {
  private activeMovie?: CinemaMovie;
  private activeSource?: CinemaSource;
  private activeSeat: CinemaSeat = 'Reihe 1 (Parkett Mitte)';
  private ticketPurchased = false;
  private frame?: HTMLIFrameElement;
  private video?: HTMLVideoElement;
  private releaseYouTube?: () => void;
  private generation = 0;
  private dialog?: VenueDialog;

  constructor(
    private parent: HTMLElement,
    private changed: () => void = () => {}
  ) {}

  get isOpen(): boolean {
    return Boolean(this.dialog?.isOpen);
  }

  get currentSeat(): CinemaSeat {
    return this.activeSeat;
  }

  get hasTicket(): boolean {
    return this.ticketPurchased;
  }

  get currentMovie(): CinemaMovie | undefined {
    return this.activeMovie;
  }

  setSeat(seat: CinemaSeat): void {
    this.activeSeat = seat;
  }

  setTicket(hasTicket: boolean): void {
    this.ticketPurchased = hasTicket;
  }

  stop(): void {
    ++this.generation;
    this.releaseYouTube?.();
    this.releaseYouTube = undefined;
    if (this.frame) {
      this.frame.remove();
      this.frame = undefined;
    }
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video.remove();
      this.video = undefined;
    }
    this.activeSource = undefined;
    this.activeMovie = undefined;
  }

  open(parent: HTMLElement): VenueDialog {
    this.stop();

    const dialog = new VenueDialog(parent, 'Wanderkino · Magic Lantern', () => {
      this.stop();
      this.dialog = undefined;
    });
    this.dialog = dialog;
    dialog.panel.dataset.venue = 'cinema';

    const render = () => {
      dialog.content.replaceChildren();

      const currentBalance = WalletService.getSyncBalance();

      // Header Box with Wallet and Ticket status
      const headerBox = document.createElement('div');
      headerBox.className = 'rdo-venue__bar-header';
      dialog.content.append(headerBox);

      const balPill = text('div', `💰 Dein Guthaben: ${formatCoins(currentBalance)} Coins`, headerBox);
      balPill.className = 'rdo-venue__balance-pill';

      const ticketPill = text(
        'span',
        this.ticketPurchased ? '🎟️ Kinokarte: Gültig (Einlass gewährt)' : `🎟️ Kinokarte erforderlich (${TICKET_PRICE} Coins)`,
        headerBox
      );
      ticketPill.className = 'rdo-venue__drink-tag';
      ticketPill.style.marginLeft = '12px';
      if (this.ticketPurchased) {
        ticketPill.style.borderColor = '#9ec297';
        ticketPill.style.color = '#9ec297';
      }

      text(
        'p',
        'Willkommen im Magic Lantern Wanderkino von Valentine! Nimm Platz auf den Samtsesseln und genieße die Filmvorführung auf der großen Leinwand.',
        headerBox
      );

      // Seat selection bar
      const seatBox = document.createElement('div');
      seatBox.className = 'rdo-cinema__seats';
      headerBox.append(seatBox);

      text('strong', '💺 Dein Platz:', seatBox);
      for (const seat of CINEMA_SEATS) {
        const seatBtn = dialog.button(seat, () => {
          this.activeSeat = seat;
          dialog.status.textContent = `Du hast in ${seat} Platz genommen.`;
          render();
        }, seatBox);
        seatBtn.className = 'rdo-cinema__seat-btn';
        if (this.activeSeat === seat) {
          seatBtn.classList.add('rdo-cinema__seat-btn--active');
        }
      }

      // Stage / Screen
      const stage = document.createElement('div');
      stage.className = 'rdo-cinema__stage';
      dialog.content.append(stage);

      if (this.activeSource) {
        const generation = this.generation;
        if (this.activeSource.provider === 'youtube') {
          const frame = (this.frame = document.createElement('iframe'));
          frame.className = 'rdo-cinema__frame';
          frame.title = `${this.activeMovie ? this.activeMovie.title : 'Wanderkino'} Filmvorführung`;
          frame.src = this.activeSource.embedUrl!;
          frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
          frame.allowFullscreen = true;
          frame.referrerPolicy = 'strict-origin-when-cross-origin';

          stage.append(frame);

          this.releaseYouTube = observeYouTube(
            frame,
            (code) => {
              if (generation !== this.generation) return;
              dialog.status.textContent = youtubeError(code);
            },
            () => {
              if (generation === this.generation) {
                dialog.status.textContent = 'YouTube-Steuerung nicht erreichbar. Starte die Wiedergabe direkt im Bild.';
              }
            }
          );
        } else {
          const video = (this.video = document.createElement('video'));
          video.className = 'rdo-cinema__video';
          video.src = this.activeSource.canonicalUrl;
          video.controls = true;
          video.playsInline = true;
          video.autoplay = true;
          stage.append(video);
        }

        // Screen Controls Below Stage
        const controls = document.createElement('div');
        controls.className = 'rdo-cinema__controls';
        controls.style.display = 'flex';
        controls.style.justifyContent = 'space-between';
        controls.style.alignItems = 'center';
        controls.style.margin = '8px 0 16px';
        dialog.content.append(controls);

        dialog.button('⏹️ Vorführung stoppen', () => {
          this.stop();
          dialog.status.textContent = 'Vorführung beendet. Der Samtvorhang schließt sich.';
          render();
        }, controls);

        if (this.activeSource.externalUrl) {
          const extLink = text('a', 'Beim Anbieter öffnen ↗', controls);
          extLink.href = this.activeSource.externalUrl;
          extLink.target = '_blank';
          extLink.rel = 'noopener noreferrer';
          extLink.className = 'rdo-venue__drink-tag';
          extLink.style.textDecoration = 'none';
        }
      } else {
        // Curtain overlay
        const curtain = document.createElement('div');
        curtain.className = 'rdo-cinema__curtain';
        stage.append(curtain);

        text('h3', '🎬 Vorhang geschlossen', curtain);
        text(
          'p',
          this.ticketPurchased
            ? 'Du hast ein gültiges Ticket! Wähle unten einen Film aus dem Spielplan oder trage eine eigene URL ein.'
            : `Um die Vorführung zu starten, löse bitte eine Kinokarte für ${TICKET_PRICE} Coins an der Kasse.`,
          curtain
        );

        if (!this.ticketPurchased) {
          const canAfford = currentBalance >= BigInt(TICKET_PRICE);
          const buyBtn = dialog.button(
            canAfford ? `🎟️ Ticket lösen (${TICKET_PRICE} Coins)` : `Zu wenig Coins für Ticket (${TICKET_PRICE})`,
            async () => {
              const res = await purchaseCinemaTicket();
              if (res.success) {
                this.ticketPurchased = true;
                this.changed();
                dialog.status.textContent = res.message;
                render();
              } else {
                dialog.status.textContent = res.message;
              }
            },
            curtain
          );
          buyBtn.disabled = !canAfford;
        }
      }

      // Catalog of Classic Movies
      text('h3', '🎞️ Spielplan: Stummfilm-Klassiker & Western', dialog.content);
      const catalogGrid = document.createElement('div');
      catalogGrid.className = 'rdo-cinema__movies-grid';
      dialog.content.append(catalogGrid);

      for (const movie of CINEMA_CATALOG) {
        const card = document.createElement('div');
        card.className = 'rdo-cinema__movie-card';
        if (this.activeMovie?.id === movie.id) {
          card.classList.add('rdo-cinema__movie-card--active');
        }
        catalogGrid.append(card);

        const title = text('div', movie.title, card);
        title.className = 'rdo-cinema__movie-title';

        const meta = text('div', `${movie.year} · ${movie.duration} · Regie: ${movie.director}`, card);
        meta.className = 'rdo-cinema__movie-meta';

        const desc = text('p', movie.description, card);
        desc.className = 'rdo-cinema__movie-desc';

        const isPlayingThis = this.activeMovie?.id === movie.id;
        dialog.button(
          isPlayingThis ? '▶️ Läuft aktuell' : '▶️ Film vorführen',
          async () => {
            if (!this.ticketPurchased) {
              const res = await purchaseCinemaTicket();
              if (!res.success) {
                dialog.status.textContent = res.message;
                return;
              }
              this.ticketPurchased = true;
              this.changed();
            }

            this.stop();
            try {
              const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost';
              this.activeSource = resolveCinemaSource(movie.url, origin);
              this.activeMovie = movie;
              dialog.status.textContent = `Projektor gestartet: „${movie.title}“ läuft auf der Leinwand.`;
              render();
            } catch (err) {
              dialog.status.textContent = (err as Error).message;
            }
          },
          card
        );
      }

      // Custom URL Input
      const customSection = document.createElement('div');
      customSection.className = 'rdo-cinema__custom';
      customSection.style.marginTop = '20px';
      customSection.style.borderTop = '1px solid #766443';
      customSection.style.paddingTop = '14px';
      dialog.content.append(customSection);

      text('h3', '🌐 Eigene Video-URL vorführen', customSection);
      text('p', 'Du kannst jedes frei einbettbare YouTube-Video oder einen direkten MP4-Stream auf die Leinwand werfen.', customSection);

      const urlInput = dialog.input('Video-Webadresse (HTTPS):', 'url', '');
      urlInput.placeholder = 'https://www.youtube.com/watch?v=...';

      dialog.button('🎬 Video auf die Leinwand projizieren', async () => {
        if (!urlInput.value.trim()) {
          dialog.status.textContent = 'Bitte zuerst eine Video-Webadresse eingeben.';
          return;
        }

        if (!this.ticketPurchased) {
          const res = await purchaseCinemaTicket();
          if (!res.success) {
            dialog.status.textContent = res.message;
            return;
          }
          this.ticketPurchased = true;
          this.changed();
        }

        this.stop();
        try {
          const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost';
          this.activeSource = resolveCinemaSource(urlInput.value, origin);
          this.activeMovie = {
            id: 'custom-video',
            title: 'Eigenes Video',
            year: new Date().getFullYear(),
            duration: 'Unbegrenzt',
            director: 'Outlaw Cinema Host',
            url: urlInput.value,
            description: 'Individuell eingespeister Videostream im Valentine Wanderkino.'
          };
          dialog.status.textContent = 'Individuelles Video gestartet. Gute Unterhaltung!';
          render();
        } catch (err) {
          dialog.status.textContent = (err as Error).message;
        }
      }, customSection);
    };

    render();
    return dialog;
  }

  dispose(): void {
    this.stop();
    this.dialog?.close();
    this.dialog = undefined;
  }
}

