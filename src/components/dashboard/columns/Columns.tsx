import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { styled } from 'styled-components';
import Column from './Column';
import ColumnItem from './ColumnItem';
import {
  getDefaultChild,
  IChildColumn,
  IChildColumnElement,
  maxColumns,
  recalculateChildDistribution
} from './mapNodesToColumns';

const allColumns = [...Array(maxColumns).keys()];
const flatten = (list: (IChildColumnElement[] | IChildColumnElement | null)[]): IChildColumnElement[] =>
  list
    .filter(a => a)
    .reduce(
      (a: IChildColumnElement[], b) => a.concat(Array.isArray(b) ? flatten(b) : (b as IChildColumnElement)),
      [] as IChildColumnElement[]
    );

const getWidth = () => window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

const getColumns = (width: number): number => {
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

interface IColumnsProps {
  children: (IChildColumnElement[] | IChildColumnElement | null)[];
}
const Columns = ({ children }: IColumnsProps) => {
  const allReactChildren = flatten(children).filter(child => child);
  const oldColumns = useRef(getColumns(getWidth()));
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [containers, setContainers] = useState<HTMLElement[]>([]);
  const [columns, setColumns] = useState(oldColumns.current);
  const [childHeights, setChildHeights] = useState<Record<string | number, number>>({});
  const [childDistribution, setChildDistribution] = useState<IChildColumn[]>([]);

  const onHeightChange = useCallback((key: string | number, height: number) => {
    setChildHeights(oldHeights => {
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
    setChildDistribution(oldChildDistribution => {
      const updatedChilds = allReactChildren.map(reactChild => {
        const existingChild = oldChildDistribution.find(c => c.key === reactChild?.key);
        return existingChild ? existingChild : getDefaultChild(reactChild, columns);
      });

      recalculateChildDistribution(updatedChilds, childHeights, columns, columns !== oldColumns.current);

      return updatedChilds;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReactChildren.map(child => child?.key).join(','), JSON.stringify(childHeights), columns]);

  useLayoutEffect(() => {
    setContainers(refs.current.filter(Boolean) as HTMLDivElement[]);
  }, []);

  console.log('Columns render', { columns, childDistribution });
  return (
    <StyledColumns key="columns">
      {allColumns.map((_, i) => (
        <Column
          key={`column#${i}`}
          ref={el => {
            refs.current[i] = el;
          }}
          columns={columns}
          index={i}
        />
      ))}
      {childDistribution.map(child => (
        <ColumnItem
          key={`columnItem#${child.key}`}
          childKey={child.key}
          container={containers[child.column ?? 0]}
          onHeightChange={onHeightChange}
        >
          {child.reactChild}
        </ColumnItem>
      ))}
      <div style={{ clear: 'both' }}></div>
    </StyledColumns>
  );
};

export default Columns;
