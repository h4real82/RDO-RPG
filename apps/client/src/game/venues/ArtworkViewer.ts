import { VenueDialog, text } from './VenueDialog';
import { isDetachedTarget } from '../input/InputTarget';
import './Venues.css';

export interface ArtworkSlot {
  id: string;
  title: string;
  artist: string;
  year: string;
  aspect: string;
  recommendedSize: string;
  defaultUrl: string;
  currentUrl?: string;
}

export const DEFAULT_SALOON_ARTWORK: ArtworkSlot = {
  id: 'smithfields-saloon-wall-a',
  title: 'Cumberland Falls im Abendlicht',
  artist: 'Albert Bierstadt (zugeschrieben)',
  year: '1898',
  aspect: '4:3',
  recommendedSize: '1024 × 768 px (PNG / WebP / JPG)',
  defaultUrl: '/runtime/valentine/verified-scene/textures/interiors/smithfields-saloon/val_cs_salpaintings08_ab.png'
};

export class ArtworkViewer {
  private dialog?: VenueDialog;
  private currentArtwork: ArtworkSlot = { ...DEFAULT_SALOON_ARTWORK };
  private userUploadedBlobUrl?: string;

  constructor(private readonly onTextureUpdated?: (blobUrl: string) => void) {}

  get isOpen(): boolean {
    return Boolean(this.dialog?.isOpen);
  }

  open(parent: HTMLElement, slot: ArtworkSlot = DEFAULT_SALOON_ARTWORK): VenueDialog {
    this.close();
    this.currentArtwork = { ...slot };

    const dialog = new VenueDialog(parent, 'Wandgemälde · Detailansicht & Anpassung', () => {
      this.close();
    });
    this.dialog = dialog;
    dialog.panel.dataset.venue = 'artwork-viewer';

    this.render(dialog);
    return dialog;
  }

  close(): void {
    try {
      this.dialog?.close();
      this.dialog = undefined;
    } catch (err) {
      console.error('[ArtworkViewer] Error closing dialog:', err);
    }
  }

  private render(dialog: VenueDialog): void {
    dialog.content.replaceChildren();

    const container = document.createElement('div');
    container.className = 'rdo-artwork-viewer-container';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '16px';
    container.style.padding = '8px 0';

    // 1. Victorian Ornate Frame Wrapper
    const frame = document.createElement('div');
    frame.className = 'rdo-artwork-frame';
    frame.style.border = '10px solid #78522e';
    frame.style.outline = '4px solid #c8a35e';
    frame.style.borderRadius = '4px';
    frame.style.boxShadow = '0 12px 36px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.5)';
    frame.style.background = '#150f0c';
    frame.style.padding = '8px';
    frame.style.maxWidth = '100%';
    frame.style.display = 'flex';
    frame.style.justifyContent = 'center';

    const img = document.createElement('img');
    img.src = this.userUploadedBlobUrl || this.currentArtwork.currentUrl || this.currentArtwork.defaultUrl;
    img.alt = this.currentArtwork.title;
    img.style.maxWidth = 'min(580px, 85vw)';
    img.style.maxHeight = '360px';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    frame.append(img);
    container.append(frame);

    // 2. Painting Legend & Details
    const captionBox = document.createElement('div');
    captionBox.style.textAlign = 'center';
    captionBox.style.maxWidth = '600px';

    const titleEl = text('h3', this.currentArtwork.title, captionBox);
    titleEl.style.margin = '4px 0';
    titleEl.style.fontSize = '20px';
    titleEl.style.color = '#382215';

    const metaEl = text('p', `Öl auf Leinwand · ${this.currentArtwork.artist}, ${this.currentArtwork.year}`, captionBox);
    metaEl.style.margin = '0 0 8px 0';
    metaEl.style.fontStyle = 'italic';
    metaEl.style.color = '#6a513d';

    const specNote = text(
      'p',
      `📐 Format: ${this.currentArtwork.aspect} | Empfohlen: ${this.currentArtwork.recommendedSize}`,
      captionBox
    );
    specNote.style.fontSize = '13px';
    specNote.style.margin = '0 0 12px 0';
    specNote.style.color = '#7d6148';

    container.append(captionBox);

    // 3. Custom Image Upload / Replacement Action
    const actionsRow = document.createElement('div');
    actionsRow.style.display = 'flex';
    actionsRow.style.gap = '12px';
    actionsRow.style.flexWrap = 'wrap';
    actionsRow.style.justifyContent = 'center';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/webp,image/jpeg';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', (event) => {
      try {
        if (!event || isDetachedTarget(event)) return;
        const file = fileInput.files?.[0];
        if (!file) return;

        if (this.userUploadedBlobUrl) {
          URL.revokeObjectURL(this.userUploadedBlobUrl);
        }
        this.userUploadedBlobUrl = URL.createObjectURL(file);
        img.src = this.userUploadedBlobUrl;
        dialog.status.textContent = `✓ Eigenes Bild „${file.name}“ erfolgreich geladen und im Saloon platziert!`;
        this.onTextureUpdated?.(this.userUploadedBlobUrl);
      } catch (err) {
        console.error('[ArtworkViewer] Could not load user image:', err);
        dialog.status.textContent = 'Fehler beim Laden des ausgewählten Bildes.';
      }
    });

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'rdo-venue__btn';
    uploadBtn.textContent = '🖼️ Eigenes Bild auswählen (PNG / WebP / JPG)';
    uploadBtn.addEventListener('click', (event) => {
      try {
        if (!event || isDetachedTarget(event)) return;
        fileInput.click();
      } catch (err) {
        console.error('[ArtworkViewer] Error triggering file input:', err);
      }
    });

    actionsRow.append(fileInput, uploadBtn);

    if (this.userUploadedBlobUrl) {
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'rdo-venue__btn';
      resetBtn.style.opacity = '0.85';
      resetBtn.textContent = '↺ Originalbild wiederherstellen';
      resetBtn.addEventListener('click', () => {
        try {
          if (this.userUploadedBlobUrl) {
            URL.revokeObjectURL(this.userUploadedBlobUrl);
            this.userUploadedBlobUrl = undefined;
          }
          img.src = this.currentArtwork.defaultUrl;
          dialog.status.textContent = 'Originalgemälde wiederhergestellt.';
          this.onTextureUpdated?.(this.currentArtwork.defaultUrl);
          this.render(dialog);
        } catch (err) {
          console.error('[ArtworkViewer] Error restoring original artwork:', err);
        }
      });
      actionsRow.append(resetBtn);
    }

    container.append(actionsRow);
    dialog.content.append(container);
  }
}
