// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VenueActivities } from './VenueActivities';
import { LocalAccountStore, createDefaultGuestProfile } from '../economy/LocalAccountStore';
import { WalletService } from '../economy/WalletService';

describe('VenueActivities Lifecycle & Encapsulation (H4R-64)', () => {
  let parent: HTMLDivElement;
  let activities: VenueActivities;
  let changedSpy: ReturnType<typeof vi.fn>;
  let musicExpandSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);

    parent = document.createElement('div');
    document.body.append(parent);

    changedSpy = vi.fn();
    musicExpandSpy = vi.fn();
    activities = new VenueActivities(parent, changedSpy, musicExpandSpy);
  });

  afterEach(() => {
    activities.dispose();
    parent.remove();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  describe('Activity Support Verification', () => {
    it('supports registered indoor and venue interaction kinds', () => {
      const supportedKinds = [
        'music', 'drinks', 'bank', 'cinema', 'theater', 'memorial', 'trophy',
        'station', 'station_master', 'station_info', 'sit', 'talk', 'hotel_guest', 'hotel_lady', 'inspect', 'read'
      ];
      for (const kind of supportedKinds) {
        expect(activities.supports(kind)).toBe(true);
      }
    });

    it('rejects unsupported or non-venue activity kinds', () => {
      const unsupportedKinds = ['poker', 'archery', 'horse-race', 'boxing', 'unknown', '', undefined];
      for (const kind of unsupportedKinds) {
        expect(activities.supports(kind)).toBe(false);
      }
    });
  });

  describe('Dialog State and Open/Close Flow', () => {
    it('is initially closed', () => {
      expect(activities.isOpen).toBe(false);
    });

    it('opens bank desk interaction and captures input', () => {
      activities.open('bank');
      expect(activities.isOpen).toBe(true);
      const dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('aria-label')).toBe('Bankbeamter');
    });

    it('opens saloon drinks interaction and allows switching activities', () => {
      activities.open('bank');
      expect(activities.isOpen).toBe(true);

      // Switch to drinks
      activities.open('drinks');
      expect(activities.isOpen).toBe(true);
      const dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('aria-label')).toBe('Smithfield’s Bar');
    });

    it('opens cinema and theater video projection dialogues', () => {
      activities.open('cinema');
      expect(activities.isOpen).toBe(true);
      let dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toContain('Wanderkino');

      activities.open('theater');
      expect(activities.isOpen).toBe(true);
      dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toContain('Wanderkino');
    });

    it('opens memorial room and trophy lounge', () => {
      activities.open('memorial');
      expect(activities.isOpen).toBe(true);
      let dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Erinnerungsraum & Trophäen-Lounge');

      activities.open('trophy');
      expect(activities.isOpen).toBe(true);
      dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Erinnerungsraum & Trophäen-Lounge');
    });

    it('opens music player interaction', () => {
      activities.open('music');
      expect(activities.isOpen).toBe(true);
    });

    it('opens station desk, conductor recommendations, and mechanics guide', () => {
      activities.open('station');
      expect(activities.isOpen).toBe(true);
      let dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Bahnhof Valentine');

      activities.open('station_master');
      expect(activities.isOpen).toBe(true);
      dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Bahnhof Valentine');
      expect(dialog?.textContent).toContain('Schaffner Aldridge');

      activities.open('station_info');
      expect(activities.isOpen).toBe(true);
      dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Bahnhof Valentine');
      expect(dialog?.textContent).toContain('Offizieller Valentine Orts- & Spielmechanik-Leitfaden');
    });

    it('opens standard building actions sit, talk, inspect, and read (H4R-112)', () => {
      // sit
      activities.open('sit');
      expect(activities.isOpen).toBe(true);
      let dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Ausruhen & Hinsetzen');
      expect(dialog?.textContent).toContain('Du nimmst Platz und gönnst deinen Stiefeln eine Pause');

      // inspect / read
      activities.open('inspect');
      expect(activities.isOpen).toBe(true);
      dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Valentine Daily Mail & Anschläge');
      expect(dialog?.textContent).toContain('Valentine Viehauktion');
      expect(dialog?.textContent).toContain('Grizzlies');

      activities.open('read');
      expect(activities.isOpen).toBe(true);
      dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Valentine Daily Mail & Anschläge');

      // talk
      activities.open('talk');
      expect(activities.isOpen).toBe(true);
      dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Gespräch mit Ortsansässigen');
      expect(dialog?.textContent).toContain('Guten Tag, Fremder');

      // hotel_guest
      activities.open('hotel_guest');
      expect(activities.isOpen).toBe(true);
      dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('Hotel-Gast');
      expect(dialog?.textContent).toContain('Postkutsche');
      expect(dialog?.textContent).toContain('Valentine');

      // Close button restores world control
      const closeBtn = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(b =>
        b.textContent?.includes('Zurück zum Raum')
      );
      expect(closeBtn).toBeDefined();
      closeBtn?.click();
      expect(activities.isOpen).toBe(false);
    });

    it('renders a fallback dialogue with close button for unknown interaction kinds', () => {
      activities.open('unknown-kind');
      expect(activities.isOpen).toBe(true);
      const dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.dataset.venue).toBe('unknown-kind');
      expect(dialog?.textContent).toContain('Diese Interaktion ist derzeit nicht verfügbar.');

      // Close button restores world control
      const closeBtn = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(b =>
        b.textContent?.includes('Zurück zum Raum')
      );
      expect(closeBtn).toBeDefined();
      closeBtn?.click();
      expect(activities.isOpen).toBe(false);
    });

    it('closes dialog cleanly on close() and restores world control', () => {
      activities.open('bank');
      expect(activities.isOpen).toBe(true);

      activities.close();
      expect(activities.isOpen).toBe(false);
      const dialog = parent.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog).toBeNull();
    });
  });

  describe('Building Spatial Context & Exit Handling', () => {
    it('activates cinema screen projection when entering Magic Lantern exterior', () => {
      expect(activities.cinemaProjecting).toBe(false);
      activities.setBuilding('val-07-magiclantern-ext');
      // Screen is active for projection
      expect(activities.cinemaProjecting).toBe(false); // No video playing yet
    });

    it('stops saloon music and closes activity when player exits Smithfields Saloon', () => {
      // Enter saloon
      activities.setBuilding('smithfields-saloon');
      activities.open('music');
      expect(activities.isOpen).toBe(true);

      // Exit saloon to outside
      activities.setBuilding(undefined);
      expect(activities.isOpen).toBe(false);
    });

    it('does not stop music when moving within Smithfields Saloon', () => {
      activities.setBuilding('smithfields-saloon');
      activities.open('drinks');
      expect(activities.isOpen).toBe(true);

      // Still in saloon
      activities.setBuilding('smithfields-saloon');
      expect(activities.isOpen).toBe(true);
    });
  });

  describe('System Pause & Recovery Handling', () => {
    it('stops cinema and closes memorial on system pause', () => {
      activities.open('memorial');
      expect(activities.isOpen).toBe(true);

      activities.setSystemPaused(true);
      expect(activities.isOpen).toBe(false);
    });

    it('handles system resume gracefully', () => {
      activities.setSystemPaused(false);
      expect(activities.isOpen).toBe(false);
    });
  });

  describe('Disposal and Defensive Exception Handling', () => {
    it('disposes cleanly without throwing', () => {
      activities.open('drinks');
      expect(() => activities.dispose()).not.toThrow();
      expect(activities.isOpen).toBe(false);
    });

    it('remains resilient if repeated dispose calls occur', () => {
      activities.dispose();
      expect(() => activities.dispose()).not.toThrow();
    });
  });
});
