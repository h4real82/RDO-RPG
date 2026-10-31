// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HotelGuestDialog } from './HotelGuestDialog';
import { LocalAccountStore, createDefaultGuestProfile } from '../economy/LocalAccountStore';
import { WalletService } from '../economy/WalletService';
import { ScreenEffects } from './ScreenEffects';

describe('HotelGuestDialog Branching Dialogue System', () => {
  let parent: HTMLDivElement;
  let dialog: HotelGuestDialog;
  let changedSpy: ReturnType<typeof vi.fn>;
  let wettsaufenSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    LocalAccountStore.saveProfile(createDefaultGuestProfile());
    WalletService.setActiveProfile(null, false);

    parent = document.createElement('div');
    document.body.append(parent);

    changedSpy = vi.fn();
    wettsaufenSpy = vi.fn();

    dialog = new HotelGuestDialog(parent, {
      onChanged: changedSpy,
      onWettsaufen: wettsaufenSpy
    });
  });

  afterEach(() => {
    dialog.close();
    parent.remove();
    document.body.replaceChildren();
    ScreenEffects.clearAll();
    vi.restoreAllMocks();
  });

  it('opens main greeting with options', () => {
    dialog.open(parent);
    expect(dialog.isOpen).toBe(true);

    const textContent = parent.textContent ?? '';
    expect(textContent).toContain('Soll ich mit Ihnen aufs Zimmer gehen');
    expect(textContent).toContain('Ja gerne, gehen wir auf ein Zimmer!');
    expect(textContent).toContain('Nein, ich brauche dich für etwas anderes.');
    expect(textContent).toContain('Halt die Klappe!');
  });

  it('navigates to room proposal and executes rest with censorship effect', async () => {
    vi.spyOn(ScreenEffects, 'applyCensorshipPixelEffect').mockResolvedValue();

    dialog.open(parent);

    // Click "Ja gerne, gehen wir auf ein Zimmer!"
    const btnRoom = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ja gerne')
    );
    expect(btnRoom).toBeDefined();
    btnRoom?.click();

    expect(parent.textContent).toContain('Deluxe-Zimmer im 1. Obergeschoss');
    expect(parent.textContent).toContain('10 Coins');

    const startBalance = WalletService.getSyncBalance();

    // Click rest button
    const btnRest = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ins Bett steigen')
    );
    expect(btnRest).toBeDefined();
    btnRest?.click();

    await vi.waitFor(() => {
      expect(parent.textContent).toContain('Vollständig erholt & regeneriert!');
    });

    expect(WalletService.getSyncBalance()).toBe(startBalance - 10n);
    expect(changedSpy).toHaveBeenCalled();
  });

  it('navigates to other options and executes hotel robbery (+50 coins)', async () => {
    dialog.open(parent);

    // Click "Nein, ich brauche dich für etwas anderes."
    const btnOther = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('etwas anderes')
    );
    btnOther?.click();

    expect(parent.textContent).toContain('Wobei kann eine geschäftstüchtige Dame wie ich dir behilflich sein?');

    // Click robbery
    const btnHeist = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('überfallen')
    );
    expect(btnHeist).toBeDefined();

    const startBalance = WalletService.getSyncBalance();
    btnHeist?.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(WalletService.getSyncBalance()).toBe(startBalance + 50n);
    expect(changedSpy).toHaveBeenCalled();
    expect(parent.textContent).toContain('Hotel-Überfall erfolgreich!');
    expect(parent.textContent).toContain('+50 Coins erbeutet!');
  });

  it('navigates to minigames guide and shows Valentine game locations', () => {
    dialog.open(parent);

    const btnOther = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('etwas anderes')
    );
    btnOther?.click();

    const btnGames = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ich will spielen')
    );
    btnGames?.click();

    expect(parent.textContent).toContain('Texas Hold\'em Poker');
    expect(parent.textContent).toContain('Blackjack');
    expect(parent.textContent).toContain('Saloon-Darts');
    expect(parent.textContent).toContain('Pferderennen');
  });

  it('navigates to saloon drinking challenge and triggers callback', () => {
    dialog.open(parent);

    const btnOther = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('etwas anderes')
    );
    btnOther?.click();

    const btnDrink = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Bock was zu saufen')
    );
    btnDrink?.click();

    expect(parent.textContent).toContain('Glaub ja nicht, dass du mich unter den Tisch trinken kannst');

    const btnGo = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Auf zum Saloon')
    );
    btnGo?.click();

    expect(wettsaufenSpy).toHaveBeenCalled();
    expect(dialog.isOpen).toBe(false);
  });

  it('navigates to tonics shop and purchases remedy with coins', async () => {
    dialog.open(parent);

    const btnOther = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('etwas anderes')
    );
    btnOther?.click();

    const btnTonics = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Hast du was zu verkaufen')
    );
    btnTonics?.click();

    expect(parent.textContent).toContain('Wundertinktur der Witwe');
    expect(parent.textContent).toContain('Starker Schlangenschnaps');
    expect(parent.textContent).toContain('Peyote-Traumkaktus');

    const startBalance = WalletService.getSyncBalance();
    const btnBuyTonic = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Kaufen (15 Coins)')
    );
    btnBuyTonic?.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(WalletService.getSyncBalance()).toBe(startBalance - 15n);
    expect(changedSpy).toHaveBeenCalled();
  });

  it('handles insult option with indignant reaction and closure', () => {
    dialog.open(parent);

    const btnInsult = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Halt die Klappe')
    );
    btnInsult?.click();

    expect(parent.textContent).toContain('ungehobelten Klotz');
    expect(parent.textContent).toContain('Die Dame ist beleidigt');

    const btnClose = Array.from(parent.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Gespräch beenden')
    );
    btnClose?.click();

    expect(dialog.isOpen).toBe(false);
  });
});
