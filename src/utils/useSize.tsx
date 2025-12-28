import useResizeObserver from '@react-hook/resize-observer';
import { RefObject, useLayoutEffect, useState } from 'react';

type TypeOfSize = 'client' | 'offset';
interface ISize {
  height?: number;
  width?: number;
}

const defaultSize: ISize = { height: undefined, width: undefined };

export const useSize = (
  target: RefObject<HTMLDivElement | null>,
  observeWidth?: boolean,
  observeHeight?: boolean,
  typeOfSize: TypeOfSize = 'client'
) => {
  const [size, setSize] = useState<ISize>(defaultSize);

  useLayoutEffect(() => {
    if (target.current) {
      switch (typeOfSize) {
        case 'client':
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSize({ height: target.current.clientHeight, width: target.current.clientWidth });
          break;
        case 'offset':
          setSize({ height: target.current.offsetHeight, width: target.current.offsetWidth });
          break;
      }
    }
  }, [target, typeOfSize]);

  useResizeObserver(target, () => {
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
