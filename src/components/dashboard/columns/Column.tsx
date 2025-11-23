import styled from 'styled-components';
import { IChildColumnElement } from './mapNodesToColumns';

interface IStyledColumnProps {
  column: number;
  columns: number;
  gap: number;
  visible: boolean;
}
const StyledColumn = styled.div<IStyledColumnProps>`
  border-left: ${(props) => (props.column > 0 ? '#808080 dotted 1px' : 'unset')};
  box-sizing: border-box;
  float: left;
  visible: ${(props) => (props.visible ? 'true' : 'false')};
  width: ${(props) => (1 / props.columns) * 100}%;
  min-height: 1px;
  padding-left: ${(props) => (props.column > 0 ? props.gap : 0)}px;
  padding-right: ${(props) => (props.column < props.columns - 1 ? props.gap : 0)}px;
`;

interface IColumnProps {
  columns: number;
  index: number;
  children: IChildColumnElement[] | IChildColumnElement;
}
const Column = ({ columns, index, children }: IColumnProps) => (
  <StyledColumn className="parent" column={index} columns={columns} visible={index < columns} gap={24}>
    {children}
  </StyledColumn>
);

export default Column;
