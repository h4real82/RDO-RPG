export interface ActivePoi {
  id: string;
  category: string;
}

export interface InteractionMenu {
  open(message: string): void;
  close(): void;
}

export interface InteractionRuntimeOptions {
  getActivePoi(): ActivePoi | undefined;
  menu: InteractionMenu | undefined;
  onInteract?: (poi: ActivePoi) => void;
}

export class InteractionRuntime {
  constructor(private readonly options: InteractionRuntimeOptions) {}

  handleKey(event: KeyboardEvent): void {
    try {
      if (!event || typeof event.key!=='string' || event.defaultPrevented || event.isComposing
        || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.repeat && event.key.toLowerCase()==='f') return;
      if (event.key === 'Escape') {
        event.preventDefault?.();
        this.options.menu?.close();
        return;
      }
      if (event.key === 'Tab') {
        return;
      }
      if (event.key.toLowerCase() !== 'f') return;
      event.preventDefault?.();
      const poi = this.options.getActivePoi();
      if (!poi) return;
      if (this.options.onInteract) { this.options.onInteract(poi); return; }
      this.options.menu?.open(`Interaktion für „${poi.id}“ ist noch nicht verfügbar.`);
    } catch (error) {
      console.error('Could not process interaction input.', error);
    }
  }
}
