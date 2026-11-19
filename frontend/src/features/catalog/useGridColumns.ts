import { useEffect, useState } from 'react';

/** Used where the width cannot be measured (before the first layout, or without ResizeObserver). */
const FALLBACK_COLUMNS = 3;

/**
 * How many columns of cards fit in the element, following the same rule as the grid (`auto-fill`,
 * a minimum card width and a gap). Null until the element is measured.
 */
export function useGridColumns(element: HTMLElement | null, minWidth: number, gap: number) {
  const [columns, setColumns] = useState<number | null>(null);

  useEffect(() => {
    if (!element) return;
    function fit(width: number) {
      setColumns(
        width > 0 ? Math.max(1, Math.floor((width + gap) / (minWidth + gap))) : FALLBACK_COLUMNS,
      );
    }
    fit(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) fit(entry.contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element, minWidth, gap]);

  return columns;
}
