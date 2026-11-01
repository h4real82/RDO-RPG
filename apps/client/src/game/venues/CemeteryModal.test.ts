// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CemeteryModal, VALENTINE_GRAVES, VALENTINE_SECRET_SPOTS } from './CemeteryModal';
import { LocalAccountStore, createDefaultGuestProfile } from '../economy/LocalAccountStore';
import { WalletService } from '../economy/WalletService';

describe('CemeteryModal', () => {
  let parent: HTMLElement;
  let cemetery: CemeteryModal;
  let changedCount: number;

  beforeEach(() => {
    const profile = createDefaultGuestProfile();
    profile.coins = '10';
    LocalAccountStore.saveProfile(profile);
    WalletService.setActiveProfile(null, false);

    parent = document.createElement('div');
    document.body.appendChild(parent);
    changedCount = 0;
    cemetery = new CemeteryModal(parent, () => { changedCount++; });
  });

  it('renders tombstone epitaphs correctly', () => {
    const dialog = cemetery.open();
    expect(cemetery.isOpen).toBe(true);
    expect(dialog.panel.dataset.venue).toBe('cemetery');
    expect(dialog.content.textContent).toContain('Lucky');
    expect(dialog.content.textContent).toContain('Clara Mae Higgins');
    expect(VALENTINE_GRAVES.length).toBeGreaterThanOrEqual(5);

    cemetery.close();
    expect(cemetery.isOpen).toBe(false);
  });

  it('switches to secret spots tab and awards loot coins', async () => {
    const dialog = cemetery.open();
    const secretsTabBtn = Array.from(dialog.content.querySelectorAll('button')).find(b => b.textContent?.includes('Secret Spots'));
    expect(secretsTabBtn).toBeDefined();
    secretsTabBtn?.click();

    expect(dialog.content.textContent).toContain('Geheimversteck hinter Smithfields Saloon');
    expect(VALENTINE_SECRET_SPOTS.length).toBeGreaterThanOrEqual(3);

    const initialBal = WalletService.getSyncBalance();
    const lootBtn = Array.from(dialog.content.querySelectorAll('button')).find(b => b.textContent?.includes('Versteck durchsuchen'));
    expect(lootBtn).toBeDefined();
    lootBtn?.click();

    await vi.waitFor(() => {
      expect(WalletService.getSyncBalance()).toBeGreaterThan(initialBal);
    });
    expect(changedCount).toBe(1);

    cemetery.close();
    expect(cemetery.isOpen).toBe(false);
  });
});
