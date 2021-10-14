import React, { useLayoutEffect, useRef } from 'react';
import { IChildColumnElement } from './mapNodesToColumns';

interface IColumnItemProps {
  onHeightChange: (newHeight: number) => void;
  children: IChildColumnElement;
}
const ColumnItem = ({ onHeightChange, children }: IColumnItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const newHeight = !ref.current || !ref.current.clientHeight ? 0 : ref.current.clientHeight;
    onHeightChange(newHeight);
  }, [ref]);

  return <div ref={ref}>{children}</div>;
};

export default ColumnItem;
