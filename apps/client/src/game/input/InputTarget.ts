/** Native editability includes empty and plaintext-only contenteditable attributes. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('input,textarea,select')) return true;
  const element=target instanceof HTMLElement ? target : target.parentElement;
  return Boolean(element?.isContentEditable);
}

/** A target can be removed during capture while its original bubble path remains. */
export function isDetachedTarget(event: Event): boolean {
  return event.target instanceof Node && !event.target.isConnected;
}
