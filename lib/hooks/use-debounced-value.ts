"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value` debounced by `delayMs`. Useful for typeahead inputs.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
