import { bootstrapGame } from './game/bootstrap';

function showStartupError(message: string): void {
  try {
    const panel = document.createElement('section');
    panel.setAttribute('role', 'alert');
    panel.setAttribute('aria-live', 'assertive');
    panel.tabIndex = -1;
    const text = document.createElement('p');
    text.textContent = message;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'Schließen';
    panel.append(text, closeButton);
    closeButton?.addEventListener('click', () => {
      try {
        panel.remove();
      } catch (error) {
        console.error('Could not close the startup error panel.', error);
      }
    });
    document.body.appendChild(panel);
    panel.focus();
  } catch (error) {
    console.error('Could not render the startup error panel.', error);
  }
}

try {
  const root = document.getElementById('game-container');
  if (!root) throw new Error('Game root is required');
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('view') === 'inspector') {
    void import('./game/dev/MapInspector').then(({ startMapInspector }) => startMapInspector(root)).then((dispose) => {
      if (import.meta.hot) import.meta.hot.dispose(dispose);
    }).catch((error) => {
      console.error('Could not start DEV map inspector.', error);
      showStartupError(`Karteninspektor konnte nicht starten: ${String(error)}`);
    });
  } else {
    bootstrapGame(root, { onStartupError: () => showStartupError('Der lokale Spielstart ist fehlgeschlagen. Bitte Seite neu laden.') });
  }
} catch (error) {
  console.error('Could not start the game.', error);
  showStartupError('Der lokale Spielstart ist fehlgeschlagen. Bitte Seite neu laden.');
}
