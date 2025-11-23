import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Column from './Column';
import ColumnItem from './ColumnItem';
import {
  getDefaultChild,
  IChildColumn,
  IChildColumnElement,
  maxColumns,
  recalculateChildDistribution,
} from './mapNodesToColumns';

const flatten = (list: (IChildColumnElement[] | IChildColumnElement | null)[]): IChildColumnElement[] =>
  list
    .filter((a) => a)
    .reduce(
      (a: IChildColumnElement[], b) => a.concat(Array.isArray(b) ? flatten(b) : (b as IChildColumnElement)),
      [] as IChildColumnElement[],
    );

const flattenChildColumn = (list: (IChildColumn[] | IChildColumn)[]): IChildColumn[] =>
  list.reduce(
    (a: IChildColumn[], b) => a.concat(Array.isArray(b) ? flattenChildColumn(b) : (b as IChildColumn)),
    [] as IChildColumn[],
  );

const getWidth = () => window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

const getColumns = (width: number): number => {
  if (width >= 1400) return 4;
  if (width >= 1000) return 3;
  if (width >= 700) return 2;
  return 1;
};

const StyledColumns = styled.div`
  &&& {
    max-width: 2000px;
  }
  &&& + div {
    margin-left: 0;
    margin-right: 0;
  }
  &&& + div + div {
    border-left: #808080 dotted 1px;
  }
`;

interface IColumnsProps {
  children: (IChildColumnElement[] | IChildColumnElement | null)[];
}
const Columns = ({ children }: IColumnsProps) => {
  const allReactChildren = flatten(children).filter((child) => child);
  const oldColumns = useRef(getColumns(getWidth()));
  const [columns, setColumns] = useState(oldColumns.current);
  const [childHeights, setChildHeights] = useState<Record<string | number, number>>({});
  const [childDistribution, setChildDistribution] = useState<IChildColumn[][]>([...Array(maxColumns)].map(() => []));

  const onHeightChange = useCallback((key: string | number, height: number) => {
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
        const existingChild = flattenChildColumn(oldChildDistribution).find((c) => c.key === reactChild?.key);
        return existingChild ? existingChild : getDefaultChild(reactChild, columns);
      });

      return recalculateChildDistribution(updatedChilds, childHeights, columns, columns !== oldColumns.current);
    });
  }, [allReactChildren.map((child) => child?.key).join(','), JSON.stringify(childHeights), columns]);

  return (
    <StyledColumns key="columns">
      {childDistribution.map((column, i) => (
        <Column key={`column#${i}`} columns={columns} index={i}>
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
