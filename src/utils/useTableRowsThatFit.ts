import { useCallback, useEffect, useState } from 'react';

interface IOptions {
  /** Space kept free above and below the dialog */
  margin?: number;
  /** Used until a row is rendered and can be measured */
  fallbackRowHeight?: number;
  minRows?: number;
}

/**
 * The number of table rows per page that fill the height of the window, for tables with pages but
 * without scroll. Measures the dialog (or the element) the table is in: everything except the table
 * body (title, filters, table header, pagination, buttons) is kept, the rest is filled with rows.
 * Put tableRef on an element around the table. A callback ref, since a dialog mounts its content
 * after the first render.
 */
export const useTableRowsThatFit = ({ margin = 12, fallbackRowHeight = 39, minRows = 5 }: IOptions = {}) => {
  const [pageSize, setPageSize] = useState(minRows);
  const [element, tableRef] = useState<HTMLElement | null>(null);

  const measure = useCallback(() => {
    const tbody = element?.querySelector<HTMLElement>('.ant-table-tbody');
    if (!element || !tbody) return;
    const frame = element.closest<HTMLElement>('.ant-modal-container, .ant-modal-content') ?? element;
    const row = tbody.querySelector<HTMLElement>('tr.ant-table-row');
    const rowHeight = row?.offsetHeight || fallbackRowHeight;
    const chrome = frame.offsetHeight - tbody.offsetHeight;
    const rows = Math.max(minRows, Math.floor((window.innerHeight - 2 * margin - chrome) / rowHeight));
    setPageSize(current => (current === rows ? current : rows));
  }, [element, fallbackRowHeight, margin, minRows]);

  useEffect(() => {
    if (!element) return;
    const frame = element.closest<HTMLElement>('.ant-modal-container, .ant-modal-content') ?? element;
    // The dialog changes size when the rows, filters or alerts change, and so does the window
    const observer = new ResizeObserver(() => measure());
    observer.observe(frame);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [element, measure]);

  return { pageSize, tableRef };
};
