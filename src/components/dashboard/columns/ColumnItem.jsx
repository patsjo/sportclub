/*
  componentDidUpdate(prevProps, prevState) {
    const { dimensions } = this.state;
    const dims =
      this.refs && this.refs.length > 0
        ? this.refs.map((ref) => ({
            width: !ref.current || !ref.current.clientWidth ? 0 : ref.current.clientWidth,
            height: !ref.current || !ref.current.clientHeight ? 0 : ref.current.clientHeight,
          }))
        : [];

    if (this.state.columns > 1 && JSON.stringify(dimensions) !== JSON.stringify(dims)) {
      this.setState({ dimensions: dims });
    }
  }
*/
import React, { useLayoutEffect, useState, useRef } from 'react';
const ColumnItem = ({ onHeightChange, children }) => {
  const ref = React.createRef();
  useLayoutEffect(() => {
    const newHeight = !ref.current || !ref.current.clientHeight ? 0 : ref.current.clientHeight;
    onHeightChange(newHeight);
  }, [ref]);

  return <div ref={ref}>{children}</div>;
};

export default ColumnItem;
