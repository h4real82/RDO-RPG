export interface CanvasPointerCallbacks {
  onMoveClick(clientX: number, clientY: number): void;
  onContext(clientX: number, clientY: number): void;
  onRotate(deltaRadians: number): void;
  isCaptured(): boolean;
  onCancel?():void;
}

interface Gesture {
  id: number;
  button: number;
  startX: number;
  startY: number;
  lastX: number;
  dragged: boolean;
}

/** A canvas click is committed only at release; crossing the drag threshold cancels it permanently. */
export class CanvasPointerGestures {
  private gesture?: Gesture;
  private disposed = false;
  private handledContext = false;
  private readonly view: Window | null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly callbacks: CanvasPointerCallbacks) {
    this.view = canvas.ownerDocument?.defaultView ?? null;
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('lostpointercapture', this.onCancel);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    this.view?.addEventListener('blur', this.onCancel);
  }

  private blocked(): boolean {
    const active = this.canvas.ownerDocument?.activeElement;
    return this.disposed || this.callbacks.isCaptured() || Boolean(active?.closest?.(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="dialog"],[data-game-ui]',
    ));
  }

  private readonly onDown = (event: PointerEvent): void => {
    try {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target !== this.canvas || this.blocked() || event.isPrimary === false) { this.cancel(); return; }
      if (this.gesture || (event.button !== 0 && event.button !== 2)) return;
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      this.gesture = { id: event.pointerId, button: event.button, startX: event.clientX, startY: event.clientY, lastX: event.clientX, dragged: false };
      this.handledContext = event.button === 2;
      this.canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    } catch { this.cancel(); }
  };

  private readonly onMove = (event: PointerEvent): void => {
    try {
      if (!event || this.blocked()) { this.cancel(); return; }
      const gesture = this.gesture;
      if (!gesture || gesture.id !== event.pointerId || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) gesture.dragged = true;
      if (gesture.dragged && gesture.button === 2) {
        this.callbacks.onRotate((event.clientX - gesture.lastX) * 0.008);
        event.preventDefault();
      }
      gesture.lastX = event.clientX;
    } catch { this.cancel(); }
  };

  private readonly onUp = (event: PointerEvent): void => {
    try {
      if (!event || this.blocked()) { this.cancel(); return; }
      const gesture = this.gesture;
      if (!gesture || gesture.id !== event.pointerId || gesture.button !== event.button) return;
      this.cancel();
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      if (gesture.dragged || Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) return;
      event.preventDefault();
      if (gesture.button === 0) this.callbacks.onMoveClick(event.clientX, event.clientY);
      else this.callbacks.onContext(event.clientX, event.clientY);
    } catch { this.cancel(); }
  };

  private readonly onCancel = (event: Event): void => {
    try {
      if (!event) return;
      if ('pointerId' in event && this.gesture && event.pointerId !== this.gesture.id) return;
      const active=Boolean(this.gesture);this.cancel();
      if(active || event.type==='pointercancel')this.callbacks.onCancel?.();
    } catch { this.cancel(); }
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    try {
      if (!event || event.target !== this.canvas || (!this.handledContext && this.blocked())) return;
      event.preventDefault();
      this.handledContext = false;
    } catch { this.cancel(); }
  };

  cancel(): void {
    const gesture = this.gesture;
    this.gesture = undefined;
    try {
      if (gesture && this.canvas.hasPointerCapture(gesture.id)) this.canvas.releasePointerCapture(gesture.id);
    } catch { /* Capture can already have been released by the browser. */ }
  }

  dispose(): void {
    this.cancel();
    this.disposed = true;
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('lostpointercapture', this.onCancel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.view?.removeEventListener('blur', this.onCancel);
  }
}
