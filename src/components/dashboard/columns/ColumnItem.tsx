import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSize } from '../../../utils/useSize';
import { IChildColumnElement } from './mapNodesToColumns';

interface IColumnItemProps {
  childKey: string | number;
  onHeightChange: (key: string | number, newHeight: number) => void;
  children: IChildColumnElement;
  container: HTMLElement | null;
}
const ColumnItem = ({ childKey, onHeightChange, children, container }: IColumnItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const { height } = useSize(ref, false, true);

  useEffect(() => {
    onHeightChange(childKey, height ?? 0);
  }, [childKey, height, onHeightChange, id]);

  if (!container) return null;

  return createPortal(<div ref={ref}>{children}</div>, container, childKey);
};

export default ColumnItem;
