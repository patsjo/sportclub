import { useCallback, useEffect, useState } from 'react';

interface IOptions {
  /** Space kept free below the table */
  margin?: number;
  /** Below this the page scrolls instead, e.g. a phone turned sideways */
  minHeight?: number;
}

/**
 * The height of the table body (scroll.y) that fills the rest of the window: what is above (e.g. tabs)
 * and the table header stay, only the rows scroll. Put tableRef on an element around the table (also
 * the pagination). A callback ref, since the table is often shown after the data is loaded.
 */
export const useTableScrollHeight = ({ margin = 8, minHeight = 200 }: IOptions = {}) => {
  const [height, setHeight] = useState<number>();
  const [element, tableRef] = useState<HTMLElement | null>(null);

  const measure = useCallback(() => {
    // The rows: the scrolling body when scroll.y is set, else the rows of the table
    const body =
      element?.querySelector<HTMLElement>('.ant-table-body') ?? element?.querySelector<HTMLElement>('.ant-table-tbody');
    if (!element || !body) return;
    const bodyRect = body.getBoundingClientRect();
    // From the top of the page, the same also when the page is scrolled
    const top = bodyRect.top + window.scrollY;
    // What is below the rows, e.g. the pagination
    const below = element.getBoundingClientRect().bottom - bodyRect.bottom;
    const next = Math.max(minHeight, Math.floor(window.innerHeight - top - below - margin));
    setHeight(current => (current === next ? current : next));
  }, [element, margin, minHeight]);

  useEffect(() => {
    if (!element) return;
    // Measures at once when observed. What is above changes (e.g. an alert or the rows are loaded), and so does the window
    const observer = new ResizeObserver(() => measure());
    observer.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [element, measure]);

  return { scrollHeight: height, tableRef };
};
