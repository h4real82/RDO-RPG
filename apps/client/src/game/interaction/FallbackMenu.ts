export class FallbackMenu {
  private panel: HTMLElement | undefined;

  open(message: string): void {
    try {
      this.close();
      const panel = document.createElement('section');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      const text = document.createElement('p');
      text.textContent = message;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Schließen';
      panel.append(text, button);
      panel.querySelector('button')?.addEventListener('click', () => {
        try {
          this.close();
        } catch (error) {
          console.error('Could not close fallback menu.', error);
        }
      });
      document.body.appendChild(panel);
      this.panel = panel;
    } catch (error) {
      console.error('Could not open fallback menu.', error);
    }
  }

  close(): void {
    try {
      this.panel?.remove();
      this.panel = undefined;
    } catch (error) {
      console.error('Could not dispose fallback menu.', error);
    }
  }
}
