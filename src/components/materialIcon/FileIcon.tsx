import {
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileUnknownOutlined,
  FileWordOutlined,
  FileZipOutlined
} from '@ant-design/icons';
import React from 'react';

interface IFileIconProps {
  fileType: string;
  fontSize: number;
}
const FileIcon = ({ fileType, fontSize }: IFileIconProps) => {
  if (fileType.match(/^image\/.*$/)) {
    return <FileImageOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
  }
  switch (fileType) {
    case 'application/pdf':
      return <FilePdfOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return <FilePptOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'text/plain':
      return <FileTextOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'application/zip':
      return <FileZipOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return <FileWordOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return <FileExcelOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
    default:
      return <FileUnknownOutlined style={{ verticalAlign: 'middle', fontSize: fontSize }} />;
  }
};

export default FileIcon;
