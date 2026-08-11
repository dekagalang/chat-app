/**
 * Utility functions
 */

export function classNames(
  ...classes: (string | undefined | null | boolean)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export type TimeoutHandle = ReturnType<typeof setTimeout>;

export function clearDebounced(timeoutRef: { current: TimeoutHandle | null }) {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

export function debounce(
  timeoutRef: { current: TimeoutHandle | null },
  callback: () => void,
  delay = 500,
) {
  clearDebounced(timeoutRef);

  timeoutRef.current = setTimeout(() => {
    timeoutRef.current = null;
    callback();
  }, delay);
}

export function clearDebouncedMap<Key>(timeouts: Map<Key, TimeoutHandle>, key: Key) {
  const existingTimeout = timeouts.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    timeouts.delete(key);
  }
}

export function debounceMap<Key>(timeouts: Map<Key, TimeoutHandle>, key: Key, callback: () => void, delay = 500) {
  clearDebouncedMap(timeouts, key);

  const timeout = setTimeout(callback, delay);
  timeouts.set(key, timeout);
}

export function formatOrderStatus(status?: string) {
  if (!status) return "";

  return status
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatOrderDate(date?: string) {
  if (!date) return "";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
