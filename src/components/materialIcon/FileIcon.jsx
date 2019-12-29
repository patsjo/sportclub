import React from "react";
import { Icon } from "antd";
import styled from "styled-components";

const StyledIcon = styled(Icon)`
  vertical-align: middle;
`;

const FileIcon = ({ fileType, fontSize }) => {
  if (fileType.match(/^image\/.*$/)) {
    return <StyledIcon type="file-image" style={{ fontSize: fontSize }} />;
  }
  switch (fileType) {
    case "application/pdf":
      return <StyledIcon type="file-pdf" style={{ fontSize: fontSize }} />;
    case "application/vnd.ms-powerpoint":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return <StyledIcon type="file-ppt" style={{ fontSize: fontSize }} />;
    case "text/plain":
      return <StyledIcon type="file-text" style={{ fontSize: fontSize }} />;
    case "application/zip":
      return <StyledIcon type="file-zip" style={{ fontSize: fontSize }} />;
    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return <StyledIcon type="file-word" style={{ fontSize: fontSize }} />;
    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return <StyledIcon type="file-excel" style={{ fontSize: fontSize }} />;
    default:
      return <StyledIcon type="file-unknown" style={{ fontSize: fontSize }} />;
  }
};

export default FileIcon;
