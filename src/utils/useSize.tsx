import useResizeObserver from '@react-hook/resize-observer';
import { useLayoutEffect, useMemo, useState } from 'react';

type TypeOfSize = 'client' | 'offset';
interface ISize {
  height?: number;
  width?: number;
}

const defaultSize: ISize = { height: undefined, width: undefined };

export const useSize = (
  target: React.RefObject<HTMLDivElement>,
  observe?: ('width' | 'height')[],
  typeOfSize: TypeOfSize = 'client'
) => {
  const [size, setSize] = useState<ISize>(defaultSize);
  const observeWidth = useMemo(() => !observe || observe.includes('width'), [observe]);
  const observeHeight = useMemo(() => !observe || observe.includes('height'), [observe]);

  useLayoutEffect(() => {
    if (target.current) {
      switch (typeOfSize) {
        case 'client':
          setSize({ height: target.current.clientHeight, width: target.current.clientWidth });
          break;
        case 'offset':
          setSize({ height: target.current.offsetHeight, width: target.current.offsetWidth });
          break;
      }
    }
  }, [target]);

  useResizeObserver(target, (entry) => {
    if (target.current) {
      switch (typeOfSize) {
        case 'client':
          if (
            (observeHeight && size.height !== target.current.clientHeight) ||
            (observeWidth && size.width !== target.current.clientWidth)
          ) {
            setSize({ height: target.current.clientHeight, width: target.current.clientWidth });
          }
          break;
        case 'offset':
          if (
            target.current &&
            ((observeHeight && size.height !== target.current.offsetHeight) ||
              (observeWidth && size.width !== target.current.offsetWidth))
          ) {
            setSize({ height: target.current.offsetHeight, width: target.current.offsetWidth });
          }
          break;
      }
    }
  });

  return size;
};
