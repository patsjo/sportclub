import { FormInstance, UploadFile } from 'antd';
import { ParseKeys, TFunction } from 'i18next';
import { getFileType } from './fileHelper';

export const dateFormat = 'YYYY-MM-DD';
export const weekFormat = 'GGGG-WW';
export const timeFormat = 'HH:mm:ss';
export const timeFormatWithoutHour = 'mm:ss';
export const shortTimeFormat = 'HH:mm';
export const datetimeFormat = `${dateFormat} ${timeFormat}`;
export const maxByteSize = 32000000;

export interface INumberOption {
  code: number;
  description: string;
}
export interface IOption {
  code: number | string;
  description: string;
}

export const parseIntegerFromString = (input: string): number | null => {
  const parsedInt = parseInt(input, 10);

  // Check if the result is a valid number
  if (isNaN(parsedInt)) {
    return null;
  }

  return parsedInt;
};

interface ExtendedFileReader extends FileReader {
  content?: string;
}

export interface IFile extends UploadFile {
  base64Content?: string;
  isOriginalFile?: boolean;
}

const normFile = (file: IFile): Promise<IFile> => {
  if (FileReader.prototype.readAsArrayBuffer == null) {
    FileReader.prototype.readAsArrayBuffer = function (fileData) {
      let binary = '';

      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        if (reader.result instanceof ArrayBuffer) {
          const bytes = new Uint8Array(reader.result);
          const length = bytes.byteLength;
          for (let i = 0; i < length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          //pt.result  - readonly so assign content to another property
          (this as ExtendedFileReader).content = binary;
          this.onload?.(ev);
        }
      };
      reader.readAsArrayBuffer(fileData);
    };
  }

  return new Promise((resolve, reject) => {
    const reader: ExtendedFileReader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
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
        isOriginalFile: file.isOriginalFile,
        originFileObj: file.originFileObj
      });
    };
    if (file.originFileObj) {
      reader.readAsArrayBuffer(file.originFileObj);
    } else {
      resolve(file);
    }
  });
};

export const normFiles = ({ fileList }: { fileList: IFile[] }): Promise<IFile[]> => {
  const promises = fileList.map(normFile);

  return new Promise((resolve, reject) => {
    Promise.all(promises)
      .then(files => resolve(files))
      .catch(e => reject(e));
  });
};

export const hasErrors = (form: FormInstance): Promise<boolean> =>
  new Promise(resolve => {
    if (!form) {
      resolve(true);
      return;
    }
    form
      .validateFields()
      .then(() => resolve(false))
      .catch(e => resolve(e.errorFields.length > 0));
  });

export const errorRequiredField = (t: TFunction, i18nField: ParseKeys): string =>
  `${t('error.RequiredField')} ${t(i18nField).toLowerCase()}`;

export const warningIncludeAll = (t: TFunction, i18nField: ParseKeys): string =>
  `${t('error.WarningIncludeAll')} ${t(i18nField).toLowerCase()}`;
