import styled from "styled-components";
import { Table, Icon } from "antd";

export const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

export const StyledIcon = styled(Icon)`
  &&& {
    margin-right: 8px;
  }
`;
export const StyledTable = styled(Table)`
  &&& {
    margin-top: 8px;
    min-width: ${props => (props.minWidth ? `${props.minWidth}px` : "unset")};
  }
  &&& .ant-table-pagination.ant-pagination {
    margin-top: 8px;
    margin-bottom: 0;
  }
  &&& .ant-table-thead > tr > th,
  .ant-table-tbody > tr > td {
    padding: 4px 8px !important;
  }
`;
