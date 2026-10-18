import { isDetachedTarget } from '../input/InputTarget';
import './FallbackMenu.css';

export interface ContextAction { label: string; run(): void }

export class FallbackMenu {
  private panel: HTMLElement | undefined;
  private returnFocus: HTMLElement | undefined;

  get isOpen(): boolean {
    return Boolean(this.panel?.isConnected);
  }

  open(message: string, actions: readonly ContextAction[] = []): void {
    try {
      this.close();
      this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      const panel = document.createElement('section');
      panel.className = 'rdo-context';
      panel.addEventListener('contextmenu',event=>{try{if(event)event.preventDefault();}catch(error){console.error('Could not suppress menu context.',error);}});
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'POI-Interaktion');
      const text = document.createElement('p');
      text.textContent = message;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Schließen';
      panel.append(text, button);
      for (const action of actions) {
        const choice = document.createElement('button'); choice.type='button'; choice.textContent=action.label;
        choice.addEventListener('click', event=> {
          try {if(!this.isOpen || !choice.isConnected || event.defaultPrevented || isDetachedTarget(event))return;
            this.close();action.run();
          } catch(error) {console.error('Could not run context action.',error);}
        });
        panel.insertBefore(choice,button);
      }
      button.addEventListener('click', (event) => {
        try {
          if (!this.isOpen || !button.isConnected || event.defaultPrevented || isDetachedTarget(event)) return;
          this.close();
        } catch (error) {
          console.error('Could not close fallback menu.', error);
        }
      });
      document.body.appendChild(panel);
      this.panel = panel;
      panel.addEventListener('keydown', (event) => {
        try {
          if (!this.isOpen || event.defaultPrevented || isDetachedTarget(event) || event.isComposing
            || event.ctrlKey || event.metaKey || event.altKey) return;
          if (event.key === 'Tab') {
            event.preventDefault();event.stopPropagation();
            const buttons=Array.from(panel.querySelectorAll<HTMLButtonElement>('button'));
            const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
            buttons[(current+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
          }
          else if (event.key === 'Escape') {event.preventDefault();event.stopPropagation();this.close();}
          else if (['f','q','e'].includes(event.key.toLowerCase())) event.stopPropagation();
        } catch (error) {console.error('Could not process fallback menu input.',error);}
      });
      button.focus();
      document.addEventListener('pointerdown', this.clickAway, true);
    } catch (error) {
      console.error('Could not open fallback menu.', error);
    }
  }

  close(): void {
    try {
      document.removeEventListener('pointerdown', this.clickAway, true);
      this.panel?.remove();
      this.panel = undefined;
      const target = this.returnFocus;this.returnFocus=undefined;
      if (target?.isConnected) target.focus();
    } catch (error) {
      console.error('Could not dispose fallback menu.', error);
    }
  }

  private readonly clickAway = (event: PointerEvent): void => {
    try {if(!event || !this.panel || !(event.target instanceof Node) || this.panel.contains(event.target))return;
      event.preventDefault();event.stopPropagation();this.close();
    } catch(error) {console.error('Could not dismiss context actions.',error);}
  };
}
