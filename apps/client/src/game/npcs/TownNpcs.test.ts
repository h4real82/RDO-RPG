// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TownNpcs } from './TownNpcs';
import { LocalAccountStore, createDefaultGuestProfile } from '../economy/LocalAccountStore';
import { WalletService } from '../economy/WalletService';

describe('TownNpcs', () => {
  let parent: HTMLElement;
  let townNpcs: TownNpcs;
  let changedCount: number;

  beforeEach(() => {
    const profile = createDefaultGuestProfile();
    profile.coins = '50';
    LocalAccountStore.saveProfile(profile);
    WalletService.setActiveProfile(null, false);

    parent = document.createElement('div');
    document.body.appendChild(parent);
    changedCount = 0;
    townNpcs = new TownNpcs(parent, {
      onChanged: () => { changedCount++; }
    });
  });

  it('opens and closes Sheriff Malloy dialog with bounty board and law info', () => {
    const dialog = townNpcs.openSheriff();
    expect(townNpcs.isOpen).toBe(true);
    expect(dialog.panel.dataset.venue).toBe('sheriff');
    expect(dialog.content.textContent).toContain('Curtis Malloy');

    // Click on bounty board button
    const bountyBtn = Array.from(dialog.content.querySelectorAll('button')).find(b => b.textContent?.includes('Steckbriefe'));
    expect(bountyBtn).toBeDefined();
    bountyBtn?.click();
    expect(dialog.content.textContent).toContain('One-Eye');

    townNpcs.close();
    expect(townNpcs.isOpen).toBe(false);
  });

  it('opens Reverend Swanson dialog with spiritual blessing and cemetery lore', () => {
    const dialog = townNpcs.openReverend();
    expect(townNpcs.isOpen).toBe(true);
    expect(dialog.panel.dataset.venue).toBe('reverend');
    expect(dialog.panel.textContent).toContain('Swanson');

    // Click blessing button
    const blessBtn = Array.from(dialog.content.querySelectorAll('button')).find(b => b.textContent?.includes('Segen'));
    expect(blessBtn).toBeDefined();
    blessBtn?.click();
    expect(dialog.content.textContent).toContain('erneuert');

    townNpcs.close();
    expect(townNpcs.isOpen).toBe(false);
  });

  it('opens Dr. Barnes dialog and allows wound healing deducting coins', async () => {
    const initialBal = WalletService.getSyncBalance();
    const dialog = townNpcs.openDoctor();
    expect(townNpcs.isOpen).toBe(true);
    expect(dialog.panel.dataset.venue).toBe('doctor');
    expect(dialog.content.textContent).toContain('Dr. Barnes');

    // Click wound healing button (costs 5 coins)
    const healBtn = Array.from(dialog.content.querySelectorAll('button')).find(b => b.textContent?.includes('Wundbehandlung'));
    expect(healBtn).toBeDefined();
    healBtn?.click();

    await vi.waitFor(() => {
      expect(WalletService.getSyncBalance()).toBe(initialBal - 5n);
      expect(dialog.content.textContent).toContain('100%');
    });
    expect(changedCount).toBe(1);

    townNpcs.close();
    expect(townNpcs.isOpen).toBe(false);
  });

  it('opens Arthur Gunsmith dialog and handles ammunition purchase', async () => {
    const initialBal = WalletService.getSyncBalance();
    const dialog = townNpcs.openGunsmith();
    expect(townNpcs.isOpen).toBe(true);
    expect(dialog.panel.dataset.venue).toBe('gunsmith');
    expect(dialog.content.textContent).toContain('Arthur');

    // Buy ammo (costs 4 coins)
    const ammoBtn = Array.from(dialog.content.querySelectorAll('button')).find(b => b.textContent?.includes('Revolver-Munition'));
    expect(ammoBtn).toBeDefined();
    ammoBtn?.click();

    await vi.waitFor(() => {
      expect(WalletService.getSyncBalance()).toBe(initialBal - 4n);
    });
    expect(changedCount).toBe(1);
    expect(dialog.content.textContent).toContain('.45 Colt');

    townNpcs.close();
    expect(townNpcs.isOpen).toBe(false);
  });
});
