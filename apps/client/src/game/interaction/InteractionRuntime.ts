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
}

export class InteractionRuntime {
  constructor(private readonly options: InteractionRuntimeOptions) {}

  handleKey(event: KeyboardEvent): void {
    try {
      if (event.key === 'Escape') {
        event.preventDefault?.();
        this.options.menu?.close();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault?.();
        return;
      }
      if (event.key.toLowerCase() !== 'e') return;
      event.preventDefault?.();
      const poi = this.options.getActivePoi();
      if (!poi) return;
      this.options.menu?.open(`Interaktion für „${poi.id}“ ist noch nicht verfügbar.`);
    } catch (error) {
      console.error('Could not process interaction input.', error);
    }
  }
}
