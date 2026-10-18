import { expect, it, vi } from 'vitest';
import { CanvasPointerGestures } from './CanvasPointerGestures';

class CanvasStub extends EventTarget {
  ownerDocument = { defaultView: new EventTarget(), activeElement: null };
  setPointerCapture = vi.fn();
  releasePointerCapture = vi.fn();
  hasPointerCapture = () => true;
}
function setup() {
  const canvas = new CanvasStub();
  const callbacks = { onCancel:vi.fn(),onMoveClick: vi.fn(), onContext: vi.fn(), onRotate: vi.fn(), isCaptured: vi.fn(() => false) };
  const gestures = new CanvasPointerGestures(canvas as unknown as HTMLCanvasElement, callbacks);
  function send(type: string, x = 10, y = 10, button = 2, pointerId = 1) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { clientX: x, clientY: y, button, pointerId, isPrimary: true });
    canvas.dispatchEvent(event);
    return event;
  }
  return { canvas, callbacks, gestures, send };
}

it('distinguishes short right clicks from held rotation and suppresses native canvas context menus', () => {
  const { callbacks, send, gestures } = setup();
  send('pointerdown'); send('pointerup');
  expect(callbacks.onContext).toHaveBeenCalledWith(10, 10);
  callbacks.onContext.mockClear();
  send('pointerdown'); send('pointermove', 13); send('pointermove', 20); send('pointermove', 30); send('pointerup', 30);
  expect(callbacks.onRotate).toHaveBeenCalled();
  expect(callbacks.onContext).not.toHaveBeenCalled();
  expect(callbacks.onMoveClick).not.toHaveBeenCalled();
  expect(send('contextmenu').defaultPrevented).toBe(true);
  gestures.dispose();
});

it('moves on left click only, never on a left drag or a different pointer release', () => {
  const { callbacks, send, gestures } = setup();
  send('pointerdown', 10, 10, 0); send('pointerup', 12, 10, 0);
  expect(callbacks.onMoveClick).toHaveBeenCalledWith(12, 10);
  callbacks.onMoveClick.mockClear();
  send('pointerdown', 10, 10, 0); send('pointermove', 30, 10, 0); send('pointerup', 10, 10, 0);
  send('pointerdown', 10, 10, 0); send('pointerup', 10, 10, 0, 2);
  expect(callbacks.onMoveClick).not.toHaveBeenCalled();
  gestures.dispose();
});

it('suppresses the native menu even when the released right click just opened a modal',()=>{
  const {callbacks,send,gestures}=setup();
  callbacks.onContext.mockImplementation(()=>callbacks.isCaptured.mockReturnValue(true));
  send('pointerdown');send('pointerup');
  expect(send('contextmenu').defaultPrevented).toBe(true);
  gestures.dispose();
});

it.each(['pointercancel', 'lostpointercapture', 'blur', 'modal', 'explicit'])('cancels a gesture on %s', (reason) => {
  const { canvas, callbacks, send, gestures } = setup();
  send('pointerdown');
  if (reason === 'blur') canvas.ownerDocument.defaultView.dispatchEvent(new Event('blur'));
  else if (reason === 'modal') { callbacks.isCaptured.mockReturnValue(true); send('pointermove', 30); callbacks.isCaptured.mockReturnValue(false); }
  else if (reason === 'explicit') gestures.cancel();
  else send(reason);
  send('pointerup');
  expect(callbacks.onContext).not.toHaveBeenCalled();
  gestures.dispose();
});

it('guards captured input and callback failures, and removes every listener on disposal', () => {
  const { canvas, callbacks, send, gestures } = setup();
  callbacks.isCaptured.mockReturnValue(true);
  send('pointerdown'); send('pointerup');
  expect(callbacks.onContext).not.toHaveBeenCalled();
  expect(send('contextmenu').defaultPrevented).toBe(false);
  callbacks.isCaptured.mockReturnValue(false);
  callbacks.onContext.mockImplementation(() => { throw new Error('menu failed'); });
  expect(() => { send('pointerdown'); send('pointerup'); }).not.toThrow();
  const removeCanvas = vi.spyOn(canvas, 'removeEventListener');
  const removeWindow = vi.spyOn(canvas.ownerDocument.defaultView, 'removeEventListener');
  gestures.dispose();
  expect(removeCanvas).toHaveBeenCalledTimes(6);
  expect(removeWindow).toHaveBeenCalledTimes(1);
  callbacks.onContext.mockClear();
  send('pointerdown'); send('pointerup');
  expect(callbacks.onContext).not.toHaveBeenCalled();
});

it('blocks editable/UI focus and cancels a vertical drag even after returning to its origin', () => {
  const { canvas, callbacks, send, gestures } = setup();
  const document = canvas.ownerDocument as unknown as { activeElement: { closest: () => object | null } | null };
  document.activeElement = { closest: () => ({}) };
  send('pointerdown'); send('pointerup');
  expect(callbacks.onContext).not.toHaveBeenCalled();
  document.activeElement = null;
  send('pointerdown'); send('pointermove', 10, 20); send('pointermove', 10, 10); send('pointerup');
  expect(callbacks.onContext).not.toHaveBeenCalled();
  expect(callbacks.onMoveClick).not.toHaveBeenCalled();
  gestures.dispose();
});

it('notifies movement cancellation for interrupted capture but not a normal release',()=>{
  const {callbacks,send,gestures}=setup();send('pointerdown');send('pointerup');send('lostpointercapture');expect(callbacks.onCancel).not.toHaveBeenCalled();
  send('pointerdown');send('pointercancel');expect(callbacks.onCancel).toHaveBeenCalledOnce();gestures.dispose();
});
