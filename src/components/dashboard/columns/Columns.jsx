import React, { useState, useEffect, useCallback, useRef } from 'react';
import ColumnItem from './ColumnItem';
import { mapNodesToColumns } from './mapNodesToColumns';
import styled from 'styled-components';

const flatten = (list) => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

const getWidth = () => window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

const getColumns = (width) => {
  if (width >= 1900) return 5;
  if (width >= 1400) return 4;
  if (width >= 1000) return 3;
  if (width >= 700) return 2;
  return 1;
};

const StyledColumns = styled.div`
  &&& + div {
    margin-left: 0;
    margin-right: 0;
  }
  &&& + div + div {
    border-left: #808080 dotted 1px;
  }
`;

const StyledColumn = styled.div`
  border-left: ${(props) => (props.column > 0 ? '#808080 dotted 1px' : 'unset')};
  box-sizing: border-box;
  float: left;
  width: ${(props) => (1 / props.columns) * 100}%;
  padding-left: ${(props) => (props.column > 0 ? props.gap : 0)}px;
  padding-right: ${(props) => (props.column < props.columns - 1 ? props.gap : 0)}px;
`;

const Columns = ({ children }) => {
  const allChildren = flatten(children).filter((child) => child);
  const [renderTrigger, setRenderTrigger] = useState(false);
  const [columns, setColumns] = useState(getColumns(getWidth()));
  const childItems = useRef([]);

  const onHeightChange = useCallback(
    (key, height) => {
      const child = childItems.current.find((c) => c.key === key);

      if (child && child.height !== height) {
        child.height = height;
        mapNodesToColumns(childItems.current, columns);
        setRenderTrigger(!renderTrigger);
      }
    },
    [columns]
  );

  useEffect(() => {
    const resizeListener = () => {
      const newColumns = getColumns(getWidth());
      if (columns != newColumns) {
        mapNodesToColumns(childItems.current, newColumns);
        setColumns(newColumns);
      }
    };

    window.addEventListener('resize', resizeListener);

    return () => {
      window.removeEventListener('resize', resizeListener);
    };
  }, [columns]);

  useEffect(() => {
    childItems.current = allChildren.map((child) => {
      const existingChild = childItems.current.find((c) => c.key === child.key);
      return existingChild
        ? existingChild
        : { key: child.key, height: 70, preferredColumn: child.props.column, column: 0 };
    });
    mapNodesToColumns(childItems.current, columns);
    setRenderTrigger(!renderTrigger);
  }, [allChildren.length, columns]);

  let renderColumns = [];
  if (columns > 1) {
    const columnContent = [];
    for (let i = 0; i < columns; i++) {
      columnContent[i] = [];
    }
    React.Children.forEach(allChildren, (reactChild) => {
      const child = childItems.current.find((c) => c.key === reactChild.key);
      const column = child ? (child.column < columns ? child.column : columns - 1) : 0;
      columnContent[column].push(React.cloneElement(reactChild));
    });
    const renderedColumns = columnContent.map((column, i) => (
      <StyledColumn key={`numberOfColumns#${columns}#column${i}`} column={i} columns={columns} gap={18}>
        {column.map((child) => (
          <ColumnItem
            key={`columnItem#${child.key}#column${i}`}
            onHeightChange={(height) => onHeightChange(child.key, height)}
          >
            {child}
          </ColumnItem>
        ))}
      </StyledColumn>
    ));
    renderColumns = renderedColumns;
  } else {
    renderColumns = children;
  }

  return (
    <StyledColumns key={`numberOfColumns#${columns}`}>
      {renderTrigger && null}
      {renderColumns}
      <div style={{ clear: 'both' }}></div>
    </StyledColumns>
  );
};

export default Columns;
