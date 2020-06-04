import React from "react";
import {
  FileImageOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileZipOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileUnknownOutlined
} from "@ant-design/icons";

const FileIcon = ({ fileType, fontSize }) => {
  if (fileType.match(/^image\/.*$/)) {
    return <FileImageOutlined style={{ verticalAlign: "middle", fontSize: fontSize }} />;
  }
  switch (fileType) {
    case "application/pdf":
      return <FilePdfOutlined style={{ verticalAlign: "middle", fontSize: fontSize }} />;
    case "application/vnd.ms-powerpoint":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return <FilePptOutlined style={{ verticalAlign: "middle", fontSize: fontSize }} />;
    case "text/plain":
      return <FileTextOutlined style={{ verticalAlign: "middle", fontSize: fontSize }} />;
    case "application/zip":
      return <FileZipOutlined style={{ verticalAlign: "middle", fontSize: fontSize }} />;
    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return <FileWordOutlined style={{ verticalAlign: "middle", fontSize: fontSize }} />;
    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return <FileExcelOutlined style={{ verticalAlign: "middle", fontSize: fontSize }} />;
    default:
      return <FileUnknownOutlined style={{ verticalAlign: "middle", fontSize: fontSize }} />;
  }
};

export default FileIcon;
