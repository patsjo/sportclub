import { Select } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { SelectProps } from 'antd/lib/select';
import { UploadFile } from 'antd/lib/upload/interface';
import { TFunction } from 'i18next';
import { getFileType } from './fileHelper';

const Option = Select.Option;

export const dateFormat = 'YYYY-MM-DD';
export const weekFormat = 'GGGG-WW';
export const timeFormat = 'HH:mm:ss';
export const timeFormatWithoutHour = 'mm:ss';
export const shortTimeFormat = 'HH:mm';
export const datetimeFormat = `${dateFormat} ${timeFormat}`;
export const maxByteSize = 10485760;

export interface INumberOption {
  code: number;
  description: string;
}
export interface IOption {
  code: number | string;
  description: string;
}
interface IFormSelectProps extends Omit<SelectProps<any>, 'options'> {
  options: IOption[];
}
export const FormSelect = ({ options, ...props }: IFormSelectProps) => {
  return (
    <Select {...props}>
      {options.map((option) => (
        <Option value={option.code}>{option.description}</Option>
      ))}
    </Select>
  );
};

interface ExtendedFileReader extends FileReader {
  content?: string;
}

export interface IFile extends UploadFile {
  base64Content?: string;
  originalFile?: boolean;
}

const normFile = (file: IFile): Promise<IFile> => {
  if (FileReader.prototype.readAsBinaryString == null) {
    FileReader.prototype.readAsBinaryString = function (fileData) {
      let binary = '';
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const pt: ExtendedFileReader = this;
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        if (reader.result instanceof ArrayBuffer) {
          const bytes = new Uint8Array(reader.result);
          const length = bytes.byteLength;
          for (let i = 0; i < length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          //pt.result  - readonly so assign content to another property
          pt.content = binary;
          pt.onload && pt.onload(ev);
        }
      };
      reader.readAsArrayBuffer(fileData);
    };
  }

  return new Promise((resolve, reject) => {
    const reader: ExtendedFileReader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      let data: string | undefined;
      if (!e || !e.target) {
        data = reader.content;
      } else {
        data = e.target.result as string;
      }

      resolve({
        uid: file.uid,
        name: file.name,
        size: file.size,
        fileName: file.name,
        base64Content: data && window.btoa(data),
        type: getFileType(file),
        originalFile: file.originalFile,
        originFileObj: file.originFileObj,
      });
    };
    if (file.originFileObj) {
      reader.readAsBinaryString(file.originFileObj);
    } else {
      resolve(file);
    }
  });
};

export const normFiles = ({ fileList }: { fileList: IFile[] }): Promise<IFile[]> => {
  const promises = fileList.map(normFile);

  return new Promise((resolve, reject) => {
    Promise.all(promises)
      .then((files) => resolve(files))
      .catch((e) => reject(e));
  });
};

export const hasErrors = (form: FormInstance<any>): Promise<boolean> =>
  new Promise((resolve) => {
    if (!form) {
      resolve(true);
      return;
    }
    form
      .validateFields()
      .then(() => resolve(false))
      .catch((e) => resolve(e.errorFields.length > 0));
  });

export const errorRequiredField = (t: TFunction, i18nField: string): string =>
  `${t('error.RequiredField')} ${t(i18nField).toLowerCase()}`;

export const warningIncludeAll = (t: TFunction, i18nField: string): string =>
  `${t('error.WarningIncludeAll')} ${t(i18nField).toLowerCase()}`;
