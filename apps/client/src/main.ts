import { bootstrapGame } from './game/bootstrap';

function showStartupError(message: string): void {
  try {
    const panel = document.createElement('section');
    panel.setAttribute('role', 'alert');
    panel.setAttribute('aria-live', 'assertive');
    panel.tabIndex = -1;
    panel.innerHTML = `<p>${message}</p><button type="button">Schließen</button>`;
    const closeButton = panel.querySelector('button');
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
  bootstrapGame(root, {});
} catch (error) {
  console.error('Could not start the game.', error);
  showStartupError('Der lokale Spielstart ist fehlgeschlagen. Bitte Seite neu laden.');
}
