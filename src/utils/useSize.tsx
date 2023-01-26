import useResizeObserver from '@react-hook/resize-observer';
import { useLayoutEffect, useMemo, useState } from 'react';

interface ISize {
  height?: number;
  width?: number;
}

const defaultSize: ISize = { height: undefined, width: undefined };

export const useSize = (target: React.RefObject<HTMLDivElement>, observe?: ('width' | 'height')[]) => {
  const [size, setSize] = useState<ISize>(defaultSize);
  const observeWidth = useMemo(() => !observe || observe.includes('width'), [observe]);
  const observeHeight = useMemo(() => !observe || observe.includes('height'), [observe]);

  useLayoutEffect(() => {
    if (target.current?.clientHeight && target.current?.clientWidth) {
      setSize({ height: target.current.clientHeight, width: target.current.clientWidth });
    }
  }, [target]);

  useResizeObserver(target, (entry) => {
    if (
      (observeHeight && size.height !== entry.contentRect.height) ||
      (observeWidth && size.width !== entry.contentRect.width)
    ) {
      setSize({ height: entry.contentRect.height, width: entry.contentRect.width });
    }
  });

  return size;
};
