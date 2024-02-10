import { UploadOutlined } from '@ant-design/icons';
import { message, Upload } from 'antd';
import ImgCrop from 'antd-img-crop';
import { FormInstance } from 'antd/lib/form';
import { RcFile, UploadChangeParam, UploadFile } from 'antd/lib/upload/interface';
import { UploadRequestOption as RcCustomRequestOptions } from 'rc-upload/lib/interface';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { IFile } from 'utils/formHelper';
import { getFileType } from '../../utils/fileHelper';
import FileIcon from '../materialIcon/FileIcon';
import MaterialIcon from '../materialIcon/MaterialIcon';
import FormItem from './FormItem';

declare type BeforeUploadValueType = void | boolean | string | Blob | File;

const StyledUploadDragger = styled(Upload.Dragger)`
  &&&.ant-upload.ant-upload-drag {
    margin-top: 5px;
    display: ${({ visible }: { visible: boolean }) => (visible ? 'block' : 'none')};
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

interface IUploadDraggerProps {
  form: FormInstance<any>;
  fieldName: string;
  maxByteSize: number;
  multiple: boolean;
  asThumbnail?: boolean;
  allowedFileTypes?: string[];
  onChange?: (fileList: UploadFile[]) => Promise<void>;
}

const UploadDragger = ({
  form,
  fieldName,
  maxByteSize,
  multiple,
  asThumbnail,
  allowedFileTypes,
  onChange,
}: IUploadDraggerProps) => {
  const { t } = useTranslation();
  const [files, setFiles] = React.useState<IFile[]>((form.getFieldValue(fieldName) as IFile[]) || []);

  const addFile = ({ file, onSuccess }: RcCustomRequestOptions) => {
    setTimeout(() => {
      const response = new Response(null, { status: 200 });
      const xhr = new XMLHttpRequest();
      onSuccess && onSuccess(response, xhr);
    }, 0);
  };

  const onNormFiles = ({ file, fileList }: { file?: IFile; fileList?: IFile[] }): IFile[] => {
    let tmpFileList: IFile[] = fileList ? fileList : file ? [file] : [];

    tmpFileList = tmpFileList.filter((f) => validFile(f) && f.size && f.size <= maxByteSize);

    return tmpFileList;
  };

  const beforeUpload = (file: RcFile, FileList: RcFile[]): BeforeUploadValueType | Promise<BeforeUploadValueType> => {
    const fileIsValid = validFile(file);
    const sizeIsValid = file.size <= maxByteSize;
    if (fileIsValid && sizeIsValid && asThumbnail) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = document.createElement('img');
          img.src = reader.result ? (reader.result as string) : '';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 150;
            canvas.height = 150;
            const size = Math.min(img.naturalWidth, img.naturalHeight);
            const x = img.naturalWidth > img.naturalHeight ? Math.round((img.naturalWidth - img.naturalHeight) / 2) : 0;
            const y = img.naturalHeight > img.naturalWidth ? Math.round((img.naturalHeight - img.naturalWidth) / 2) : 0;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, x, y, size, size, 0, 0, 150, 150);
            canvas.toBlob(() => resolve());
          };
        };
        reader.readAsDataURL(file);
      });
    }
    return fileIsValid && sizeIsValid;
  };

  const onDelete = async (file: UploadFile<any>) => {
    const { setFieldsValue, getFieldValue } = form;
    let files: IFile[] = getFieldValue(fieldName) || [];
    files = files.filter((f) => f.uid !== file.uid);

    setFieldsValue({ [fieldName]: files });
    setFiles(files);
    onChange && (await onChange(files));
  };

  const onUploadChange = async ({ file, fileList }: UploadChangeParam<UploadFile<any>>) => {
    const { setFieldsValue } = form;
    const fileIsValid = validFile(file);
    const sizeIsValid = file.size && file.size <= maxByteSize;
    if (!fileIsValid) {
      message.error(t('error.FileTypeNotSupported'));
    }
    if (!sizeIsValid) {
      const maxByteSizeMegaByte = Math.round(maxByteSize / 1024 / 1024);
      message.error(t('error.FileSizeTooLarge').replace('{0}', maxByteSizeMegaByte.toString()));
    }
    if (!multiple && fileList.length > 1) {
      while (fileList.length > 1) {
        fileList.pop();
      }
    }
    if (!sizeIsValid || !fileIsValid) {
      fileList = fileList.filter((f) => f.uid !== file.uid);
    }
    if (!fileList.some((f) => f.status === 'uploading')) {
      setFieldsValue({ [fieldName]: fileList });
      setFiles(fileList);
      onChange && (await onChange(fileList));
    }
  };

  const validFile = (file: UploadFile<any> | File) => {
    const fileType = getFileType(file);

    if (Array.isArray(allowedFileTypes) && allowedFileTypes.length > 0) {
      return allowedFileTypes.includes(fileType);
    }
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

  const nofFiles = files ? files.length : 0;

  const FormDeleteFile =
    nofFiles > 0 && !multiple ? (
      <DeleteFile className="ant-upload ant-upload-drag ant-upload-drag-container">
        <StyledP className="ant-upload-drag-icon">
          <FileIcon fileType={getFileType(files[0])} fontSize={48} />
        </StyledP>
        <p className="ant-upload-text">{files[0].name}</p>
        <CloseX onClick={async () => await onDelete(files[0])}>
          <MaterialIcon icon="delete" fontSize={12} />
        </CloseX>
      </DeleteFile>
    ) : null;

  return (
    <FormItem name={fieldName} valuePropName="fileList" getValueFromEvent={onNormFiles}>
      {asThumbnail ? (
        <ImgCrop rotate quality={0.9} beforeCrop={(file) => validFile(file) && file.size <= maxByteSize && asThumbnail}>
          <StyledUploadDragger
            type="drag"
            customRequest={addFile}
            listType="picture"
            className="upload-list-inline"
            multiple={multiple}
            visible={multiple || nofFiles === 0}
            accept={
              Array.isArray(allowedFileTypes) && allowedFileTypes.length > 0
                ? allowedFileTypes.join(',')
                : 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.pps,.ppsx,.ppt,.pptx'
            }
            beforeUpload={beforeUpload}
            showUploadList={multiple ? { showPreviewIcon: false } : false}
            onChange={onUploadChange}
            onRemove={onDelete}
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
          customRequest={addFile}
          listType="picture"
          className="upload-list-inline"
          multiple={multiple}
          visible={multiple || nofFiles === 0}
          accept={
            Array.isArray(allowedFileTypes) && allowedFileTypes.length > 0
              ? allowedFileTypes.join(',')
              : 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.pps,.ppsx,.ppt,.pptx'
          }
          beforeUpload={beforeUpload}
          showUploadList={multiple ? { showPreviewIcon: false } : false}
          onChange={onUploadChange}
          onRemove={onDelete}
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
};

export default UploadDragger;
