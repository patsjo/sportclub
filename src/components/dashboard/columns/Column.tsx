import { Ref, RefObject, useLayoutEffect } from 'react';
import { styled } from 'styled-components';

interface IStyledColumnProps {
  column: number;
  columns: number;
  gap: number;
  visible: boolean;
}
const StyledColumn = styled.div<IStyledColumnProps>`
  border-left: ${props => (props.column > 0 ? '#808080 dotted 1px' : '#ffffff solid 1px')};
  box-sizing: border-box;
  float: left;
  visible: ${props => (props.visible ? 'true' : 'false')};
  width: calc(
    ${props => (1 / props.columns) * 100}% +
      (
        ${props =>
          props.columns < 3
            ? 0
            : props.column === 0 || props.column === props.columns - 1
              ? (-(props.columns - 2) * props.gap) / props.columns
              : (2 * props.gap) / props.columns}px
      )
  );
  min-height: 1px;
  padding-left: ${props => (props.column > 0 ? props.gap : 0)}px;
  padding-right: ${props => (props.column < props.columns - 1 ? props.gap : 0)}px;
`;

interface IColumnProps {
  ref: Ref<HTMLDivElement | null>;
  columnRefs: RefObject<(HTMLDivElement | null)[]>;
  columns: number;
  index: number;
  childKeyOrder: (string | number)[];
}
const Column = ({ ref, columnRefs, columns, index, childKeyOrder }: IColumnProps) => {
  useLayoutEffect(() => {
    const root = columnRefs.current[index];
    let previous: ChildNode | null = null;
    if (!root) return;

    for (const key of childKeyOrder) {
      const el = root.querySelector(`[id="${key}"]`);
      if (!el) continue;

      if (el.previousSibling !== previous) {
        root.insertBefore(el, previous?.nextSibling ?? root.firstChild);
      }

      previous = el;
    }
  }, [childKeyOrder, columnRefs, index]);

  return (
    <StyledColumn ref={ref} className="parent" column={index} columns={columns} visible={index < columns} gap={24} />
  );
};

export default Column;
