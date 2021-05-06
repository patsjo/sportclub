import React from 'react';
import styled from 'styled-components';

const StyledColumn = styled.div`
  border-left: ${(props) => (props.column > 0 ? '#808080 dotted 1px' : 'unset')};
  box-sizing: border-box;
  float: left;
  visible: ${(props) => (props.visible ? 'true' : 'false')};
  width: ${(props) => (1 / props.columns) * 100}%;
  padding-left: ${(props) => (props.column > 0 ? props.gap : 0)}px;
  padding-right: ${(props) => (props.column < props.columns - 1 ? props.gap : 0)}px;
`;

const Column = ({ Reparentable, columns, index, children }) => (
  <StyledColumn
    className="parent"
    key={`styledColumn#${index}`}
    column={index}
    columns={columns}
    visible={index < columns}
    gap={18}
  >
    <Reparentable id={`column#${index}`}>{children}</Reparentable>
  </StyledColumn>
);

export default Column;
