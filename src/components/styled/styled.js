import React from "react";
import styled from "styled-components";
import { Table, Icon, Tag } from "antd";

export const MissingTag = ({ t }) => {
  return <Tag color="volcano">{t("error.Missing")}</Tag>;
};

export const NoWrap = styled.div`
  white-space: nowrap;
`;

export const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

export const StyledIcon = styled(Icon)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;
export const StyledTable = styled(Table)`
  &&& {
    margin-top: 8px;
    min-width: ${props => (props.minWidth ? `${props.minWidth}px` : "unset")};
  }
  &&& .ant-table-scroll > .ant-table-body {
    overflow-x: auto !important;
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
