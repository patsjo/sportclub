import React from "react";
import styled from "styled-components";
import { Table, Tag } from "antd";
import { DeleteTwoTone, EditTwoTone, PlusOutlined, UploadOutlined } from "@ant-design/icons";

const StyledDeleteTwoTone = styled(DeleteTwoTone)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;

const StyledEditTwoTone = styled(EditTwoTone)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;

const StyledPlusOutlined = styled(PlusOutlined)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;

const StyledUploadOutlined = styled(UploadOutlined)`
  &&& {
    margin-right: 8px;
    font-size: 20px;
  }
`;

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

export const StyledIcon = ({ type, ...props }) => {
  switch (type) {
    case "delete":
      return <StyledDeleteTwoTone {...props} />;
    case "edit":
      return <StyledEditTwoTone {...props} />;
    case "plus":
      return <StyledPlusOutlined {...props} />;
    case "upload":
      return <StyledUploadOutlined {...props} />;
    default:
      return null;
  }
};

export const StyledTable = styled(Table)`
  &&& {
    margin-top: 8px;
    min-width: ${(props) => (props.minWidth ? `${props.minWidth}px` : "unset")};
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
