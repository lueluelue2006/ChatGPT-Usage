export const EVENT_DATA_CHANGED = "chatgpt-usage-monitor:data-changed";

export function emitDataChanged() {
  try {
    window.dispatchEvent(new CustomEvent(EVENT_DATA_CHANGED));
  } catch {
    // Ignore
  }
}

export function onDataChanged(handler) {
  window.addEventListener(EVENT_DATA_CHANGED, handler);
  return () => window.removeEventListener(EVENT_DATA_CHANGED, handler);
}

