// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CINEMA_CATALOG,
  CINEMA_SEATS,
  TICKET_PRICE,
  resolveCinemaSource,
  purchaseCinemaTicket,
  CinemaPlayer
} from './CinemaPlayer';
import { WalletService } from '../economy/WalletService';
import { LocalAccountStore, createDefaultGuestProfile } from '../economy/LocalAccountStore';

describe('Cinema Movies & Seating Specifications (H4R-76 & H4R-77)', () => {
  it('contains the curated classic silent film catalog with The Great Train Robbery', () => {
    expect(CINEMA_CATALOG.length).toBeGreaterThanOrEqual(4);

    const titles = CINEMA_CATALOG.map((m) => m.title);
    expect(titles).toContain('The Great Train Robbery');
    expect(titles).toContain('A Trip to the Moon (Die Reise zum Mond)');
    expect(titles).toContain('The General (Der General)');
    expect(titles).toContain('The Kid');

    // Forensic verification of the exact user intake URL
    const trainRobbery = CINEMA_CATALOG.find((m) => m.id === 'great-train-robbery');
    expect(trainRobbery).toBeDefined();
    expect(trainRobbery?.url).toBe('https://www.youtube.com/watch?v=gmA6MrX81z4');
    expect(trainRobbery?.year).toBe(1903);
    expect(trainRobbery?.director).toBe('Edwin S. Porter');
  });

  it('ensures each catalog movie has complete metadata', () => {
    for (const movie of CINEMA_CATALOG) {
      expect(movie.id.trim().length).toBeGreaterThan(0);
      expect(movie.title.trim().length).toBeGreaterThan(0);
      expect(movie.year).toBeGreaterThanOrEqual(1900);
      expect(movie.duration.trim().length).toBeGreaterThan(0);
      expect(movie.director.trim().length).toBeGreaterThan(0);
      expect(movie.url.startsWith('https://')).toBe(true);
      expect(movie.description.trim().length).toBeGreaterThan(15);
    }
  });

  it('defines the three authentic vintage theater seating areas', () => {
    expect(CINEMA_SEATS).toEqual([
      'Reihe 1 (Parkett Mitte)',
      'Reihe 2 (Parkett Hinten)',
      'Loge / Balkon (VIP)'
    ]);
  });
});

describe('Cinema Source Resolution & URL Handling (H4R-76)', () => {
  it('resolves standard YouTube watch URLs with proper parameters and origin', () => {
    const source = resolveCinemaSource('https://www.youtube.com/watch?v=gmA6MrX81z4', 'https://rdo-rpg.local');
    expect(source.provider).toBe('youtube');
    expect(source.label).toBe('YouTube');
    expect(source.videoId).toBe('gmA6MrX81z4');
    expect(source.canonicalUrl).toBe('https://www.youtube.com/watch?v=gmA6MrX81z4');
    expect(source.embedUrl).toContain('https://www.youtube.com/embed/gmA6MrX81z4');
    expect(source.embedUrl).toContain('enablejsapi=1');
    expect(source.embedUrl).toContain('playsinline=1');
    expect(source.embedUrl).toContain('autoplay=1');
    expect(source.embedUrl).toContain('origin=https%3A%2F%2Frdo-rpg.local');
  });

  it('resolves short youtu.be URLs', () => {
    const source = resolveCinemaSource('https://youtu.be/gmA6MrX81z4');
    expect(source.provider).toBe('youtube');
    expect(source.videoId).toBe('gmA6MrX81z4');
    expect(source.canonicalUrl).toBe('https://www.youtube.com/watch?v=gmA6MrX81z4');
  });

  it('resolves embed YouTube URLs', () => {
    const source = resolveCinemaSource('https://www.youtube.com/embed/gmA6MrX81z4');
    expect(source.provider).toBe('youtube');
    expect(source.videoId).toBe('gmA6MrX81z4');
  });

  it('resolves direct MP4 and WebM video streams', () => {
    const mp4Source = resolveCinemaSource('https://archive.org/download/silent-film/classic.mp4');
    expect(mp4Source.provider).toBe('direct');
    expect(mp4Source.canonicalUrl).toBe('https://archive.org/download/silent-film/classic.mp4');

    const webmSource = resolveCinemaSource('https://archive.org/download/silent-film/classic.webm');
    expect(webmSource.provider).toBe('direct');
  });

  it('rejects invalid or malformed video URLs with helpful German messages', () => {
    expect(() => resolveCinemaSource('')).toThrow('Bitte eine gültige Video-URL eingeben.');
    expect(() => resolveCinemaSource('not-a-url')).toThrow('Ungültiges URL-Format');
    expect(() => resolveCinemaSource('ftp://example.com/video.mp4')).toThrow('HTTPS-Webadresse');
    expect(() => resolveCinemaSource('https://www.youtube.com/watch?v=short')).toThrow('11-stellige Video-ID');
  });
});

describe('Cinema Admission & Coin Wagering Integration (H4R-77)', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);
  });

  it('purchases a ticket for 2 coins and updates outlaw wallet balance', async () => {
    const startBal = WalletService.getSyncBalance();
    expect(startBal).toBe(5000n);

    const result = await purchaseCinemaTicket();
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(4998n);
    expect(result.message).toContain('Kinokarte gelöst');
    expect(WalletService.getSyncBalance()).toBe(4998n);
  });

  it('prevents ticket purchase if outlaw balance is below the ticket price', async () => {
    // Deplete wallet
    await WalletService.reserveBet(5000);
    expect(WalletService.getSyncBalance()).toBe(0n);

    const result = await purchaseCinemaTicket();
    expect(result.success).toBe(false);
    expect(result.message).toContain('Nicht genügend Coins');
    expect(result.newBalance).toBe(0n);
  });
});

describe('CinemaPlayer Component Lifecycle & Seating (H4R-76 & H4R-77)', () => {
  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);
  });

  it('initializes with default seat and allows seat switching', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const player = new CinemaPlayer(container);
    expect(player.currentSeat).toBe('Reihe 1 (Parkett Mitte)');
    expect(player.hasTicket).toBe(false);

    player.setSeat('Loge / Balkon (VIP)');
    expect(player.currentSeat).toBe('Loge / Balkon (VIP)');

    player.setTicket(true);
    expect(player.hasTicket).toBe(true);

    player.dispose();
    container.remove();
  });

  it('opens and closes the cinema venue dialog properly', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const player = new CinemaPlayer(container);
    expect(player.isOpen).toBe(false);

    const dialog = player.open(container);
    expect(player.isOpen).toBe(true);
    expect(dialog.panel.dataset.venue).toBe('cinema');
    expect(container.querySelector('.rdo-venue')).not.toBeNull();
    expect(container.querySelector('.rdo-cinema__stage')).not.toBeNull();

    player.dispose();
    expect(player.isOpen).toBe(false);
    expect(container.querySelector('.rdo-venue')).toBeNull();

    container.remove();
  });
});

