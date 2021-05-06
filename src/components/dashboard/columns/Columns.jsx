import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Column from './Column';
import ColumnItem from './ColumnItem';
import { maxColumns, getDefaultChild, recalculateChildDistribution } from './mapNodesToColumns';
import styled from 'styled-components';
import { createReparentableSpace } from 'react-reparenting';

const { Reparentable, sendReparentableChild } = createReparentableSpace();

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

const Columns = ({ children }) => {
  const allReactChildren = flatten(children).filter((child) => child);
  const oldColumns = useRef(getColumns(getWidth()));
  const [columns, setColumns] = useState(oldColumns.current);
  const [childHeights, setChildHeights] = useState({});
  const [childDistribution, setChildDistribution] = useState([...Array(maxColumns)].map(() => []));

  const onHeightChange = useCallback((key, height) => {
    setChildHeights((oldHeights) => {
      const newHeights = { ...oldHeights };
      newHeights[key] = height;
      return newHeights;
    });
  }, []);

  useEffect(() => {
    const resizeListener = () => {
      const newColumns = getColumns(getWidth());
      if (columns != newColumns) {
        oldColumns.current = columns;
        setColumns(newColumns);
      }
    };

    window.addEventListener('resize', resizeListener);

    return () => {
      window.removeEventListener('resize', resizeListener);
    };
  }, [columns]);

  useEffect(() => {
    setChildDistribution((oldChildDistribution) => {
      const updatedChilds = allReactChildren.map((reactChild) => {
        const existingChild = flatten(oldChildDistribution).find((c) => c.key === reactChild.key);
        return existingChild ? existingChild : getDefaultChild(reactChild, columns);
      });

      return recalculateChildDistribution(
        updatedChilds,
        childHeights,
        columns,
        columns !== oldColumns.current,
        sendReparentableChild
      );
    });
  }, [allReactChildren.map((child) => child.key).join(','), JSON.stringify(childHeights), columns]);

  return (
    <StyledColumns key="columns">
      {childDistribution.map((column, i) => (
        <Column Reparentable={Reparentable} columns={columns} index={i}>
          {column.map((child) => (
            <ColumnItem key={`columnItem#${child.key}`} onHeightChange={(height) => onHeightChange(child.key, height)}>
              {child.reactChild}
            </ColumnItem>
          ))}
        </Column>
      ))}
      <div style={{ clear: 'both' }}></div>
    </StyledColumns>
  );
};

export default Columns;
