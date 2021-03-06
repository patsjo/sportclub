import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import { Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import FileIcon from '../materialIcon/FileIcon';
import MaterialIcon from '../materialIcon/MaterialIcon';
import { getFileType } from '../../utils/fileHelper';
import FormItem from './FormItem';
import ImgCrop from 'antd-img-crop';

const StyledUploadDragger = styled(Upload.Dragger)`
  &&&.ant-upload.ant-upload-drag {
    margin-top: 5px;
    display: ${(props) => (props.visible ? 'block' : 'none')};
  }
  &.upload-list-inline .ant-upload-list-item {
    float: left;
    width: 200px;
    margin-right: 8px;
  }
  &.upload-list-inline .ant-upload-animate-enter {
    animation-name: uploadAnimateInlineIn;
  }
  &.upload-list-inline .ant-upload-animate-leave {
    animation-name: uploadAnimateInlineOut;
  }
`;

const StyledP = styled.p`
  &&&&& {
    margin: 0;
  }
`;
const StyledUploadIcon = styled(UploadOutlined)`
  &&&&& {
    margin: 0;
  }
`;

const DeleteFile = styled.div`
  &&& {
    border: 1px solid #d9d9d9;
    margin-top: 5px;
    padding: 16px 0;
    pointer-events: none;
  }
`;

const CloseX = styled.div`
  pointer-events: auto;
  position: absolute;
  right: 8px;
  top: 8px;
`;

class UploadDragger extends Component {
  static propTypes = {
    form: PropTypes.object.isRequired,
    fieldName: PropTypes.string.isRequired,
    maxByteSize: PropTypes.number.isRequired,
    multiple: PropTypes.bool.isRequired,
    asThumbnail: PropTypes.bool,
    allowedFileTypes: PropTypes.arrayOf(PropTypes.string),
    t: PropTypes.func,
  };

  constructor(props) {
    super(props);

    const { fieldName, form } = props;
    const { getFieldValue } = form;
    const files = getFieldValue(fieldName) || [];

    this.state = {
      files: files,
    };
  }

  addFile = ({ onSuccess }) => {
    setTimeout(() => {
      onSuccess('ok');
    }, 0);
  };

  onNormFiles = (e) => {
    const { maxByteSize } = this.props;
    let fileList;
    if (Array.isArray(e)) {
      fileList = e;
      // eslint-disable-next-line eqeqeq
    } else if (e != undefined) {
      fileList = e.fileList;
    } else {
      fileList = [];
    }
    fileList = fileList.filter((file) => this.validFile(file) && file.size <= maxByteSize);
    return fileList;
  };

  beforeUpload = (file) => {
    const { maxByteSize, asThumbnail } = this.props;
    const validFile = this.validFile(file);
    const validSize = file.size <= maxByteSize;
    if (validFile && validSize && asThumbnail) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = document.createElement('img');
          img.src = reader.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 150;
            canvas.height = 150;
            const size = Math.min(img.naturalWidth, img.naturalHeight);
            const x = img.naturalWidth > img.naturalHeight ? Math.round((img.naturalWidth - img.naturalHeight) / 2) : 0;
            const y = img.naturalHeight > img.naturalWidth ? Math.round((img.naturalHeight - img.naturalWidth) / 2) : 0;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, x, y, size, size, 0, 0, 150, 150);
            canvas.toBlob(resolve);
          };
        };
        reader.readAsDataURL(file);
      });
    }
    return validFile && validSize;
  };

  onDelete = (file) => {
    const { fieldName, form } = this.props;
    const { setFieldsValue, getFieldValue } = form;
    let files = getFieldValue(fieldName) || [];
    files = files.filter((f) => f.uid !== file.uid);

    setFieldsValue({ [fieldName]: files });
    this.setState({ files: files });
  };

  onChange = ({ file, fileList }) => {
    const { t, maxByteSize, fieldName, form } = this.props;
    const { setFieldsValue } = form;
    const validFile = this.validFile(file);
    const validSize = file.size <= maxByteSize;
    if (!validFile) {
      message.error(t('error.FileTypeNotSupported'));
    }
    if (!validSize) {
      const maxByteSizeMegaByte = Math.round(maxByteSize / 1024 / 1024);
      message.error(t('error.FileSizeTooLarge').replace('{0}', maxByteSizeMegaByte));
    }
    if (!this.props.multiple && fileList.length > 1) {
      while (fileList.length > 1) {
        fileList.pop();
      }
    }
    if (!validSize || !validFile) {
      fileList = fileList.filter((f) => f.uid !== file.uid);
    }
    if (!fileList.some((f) => f.status === 'uploading')) {
      setFieldsValue({ [fieldName]: fileList });
      this.setState({ files: fileList });
    }
  };

  validFile = (file) => {
    const fileType = getFileType(file);

    if (Array.isArray(this.props.allowedFileTypes) && this.props.allowedFileTypes.length > 0) {
      return this.props.allowedFileTypes.includes(fileType);
    }
    // eslint-disable-next-line eqeqeq
    const isImage = fileType.match(/^image\/.*$/) != null;
    const isPdf = fileType === 'application/pdf';
    const isWord =
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isExcel =
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const isPowerpoint =
      fileType === 'application/vnd.ms-powerpoint' ||
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    return isImage || isPdf || isWord || isExcel || isPowerpoint;
  };

  render() {
    const self = this;
    const { t, fieldName, multiple, allowedFileTypes, maxByteSize, asThumbnail } = this.props;
    const { files } = this.state;
    const nofFiles = files ? files.length : 0;

    const FormDeleteFile =
      nofFiles > 0 && !multiple ? (
        <DeleteFile className="ant-upload ant-upload-drag ant-upload-drag-container">
          <StyledP className="ant-upload-drag-icon">
            <FileIcon fileType={getFileType(files[0])} fontSize={48} />
          </StyledP>
          <p className="ant-upload-text">{files[0].name}</p>
          <CloseX onClick={() => self.onDelete(files[0])}>
            <MaterialIcon icon="delete" fontSize={12} />
          </CloseX>
        </DeleteFile>
      ) : null;

    return (
      <FormItem name={fieldName} valuePropName="fileList" getValueFromEvent={self.onNormFiles}>
        {asThumbnail ? (
          <ImgCrop
            rotate
            quality={0.9}
            beforeCrop={(file) => self.validFile(file) && file.size <= maxByteSize && asThumbnail}
          >
            <StyledUploadDragger
              type="drag"
              customRequest={self.addFile}
              listType="picture"
              className="upload-list-inline"
              multiple={multiple}
              visible={multiple || nofFiles === 0}
              accept={
                Array.isArray(allowedFileTypes) && allowedFileTypes.length > 0
                  ? allowedFileTypes.join(',')
                  : 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.pps,.ppsx,.ppt,.pptx'
              }
              beforeUpload={self.beforeUpload}
              showUploadList={multiple ? { showPreviewIcon: false } : false}
              onChange={self.onChange}
              onRemove={self.onDelete}
              data-testid="attachmentsInput"
            >
              <StyledP className="ant-upload-drag-icon">
                <StyledUploadIcon />
              </StyledP>
              <p className="ant-upload-text">{t('common.Upload')}</p>
            </StyledUploadDragger>
          </ImgCrop>
        ) : (
          <StyledUploadDragger
            type="drag"
            customRequest={self.addFile}
            listType="picture"
            className="upload-list-inline"
            multiple={multiple}
            visible={multiple || nofFiles === 0}
            accept={
              Array.isArray(allowedFileTypes) && allowedFileTypes.length > 0
                ? allowedFileTypes.join(',')
                : 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.pps,.ppsx,.ppt,.pptx'
            }
            beforeUpload={self.beforeUpload}
            showUploadList={multiple ? { showPreviewIcon: false } : false}
            onChange={self.onChange}
            onRemove={self.onDelete}
            data-testid="attachmentsInput"
          >
            <StyledP className="ant-upload-drag-icon">
              <StyledUploadIcon />
            </StyledP>
            <p className="ant-upload-text">{t('common.Upload')}</p>
          </StyledUploadDragger>
        )}
        {FormDeleteFile}
      </FormItem>
    );
  }
}

const UploadDraggerWithI18n = withTranslation()(UploadDragger);

export default UploadDraggerWithI18n;
