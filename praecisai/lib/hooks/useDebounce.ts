import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates
 * after `delay` ms of no changes.  Use it to avoid firing
 * an API request on every keystroke.
 *
 * @example
 *   const debouncedSearch = useDebounce(search, 350);
 *   // debouncedSearch updates 350 ms after the user stops typing
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
