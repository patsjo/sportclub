import React, { useLayoutEffect, useRef } from 'react';

const ColumnItem = ({ onHeightChange, children }) => {
  const ref = useRef();

  useLayoutEffect(() => {
    const newHeight = !ref.current || !ref.current.clientHeight ? 0 : ref.current.clientHeight;
    onHeightChange(newHeight);
  }, [ref]);

  return <div ref={ref}>{children}</div>;
};

export default ColumnItem;
