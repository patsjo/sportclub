import { useEffect, useRef } from 'react';
import { useSize } from 'utils/useSize';
import { IChildColumnElement } from './mapNodesToColumns';

interface IColumnItemProps {
  onHeightChange: (newHeight: number) => void;
  children: IChildColumnElement;
}
const ColumnItem = ({ onHeightChange, children }: IColumnItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { height } = useSize(ref, ['height']);

  useEffect(() => {
    onHeightChange(height ?? 0);
  }, [height]);

  return <div ref={ref}>{children}</div>;
};

export default ColumnItem;
