import { Ref } from 'react';
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
  ref?: Ref<HTMLDivElement | null>;
  columns: number;
  index: number;
}
const Column = ({ ref, columns, index }: IColumnProps) => (
  <StyledColumn ref={ref} className="parent" column={index} columns={columns} visible={index < columns} gap={24} />
);

export default Column;
