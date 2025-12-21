import { useEffect, useRef } from 'react';
import { useSize } from '../../../utils/useSize';
import { IChildColumnElement } from './mapNodesToColumns';

interface IColumnItemProps {
  childKey: string | number;
  onHeightChange: (key: string | number, newHeight: number) => void;
  children: IChildColumnElement;
}
const ColumnItem = ({ childKey, onHeightChange, children }: IColumnItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { height } = useSize(ref, ['height']);

  useEffect(() => {
    onHeightChange(childKey, height ?? 0);
  }, [childKey, height, onHeightChange]);

  return <div ref={ref}>{children}</div>;
};

export default ColumnItem;
