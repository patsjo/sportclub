import { RcFile } from 'antd/lib/upload';

export const getFileType = (file: { type?: string; name: string }): string => {
  if (file.type) {
    return file.type;
  } else if (file.name.endsWith('.doc')) {
    return 'application/msword';
  } else if (file.name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else if (file.name.endsWith('.xls')) {
    return 'application/vnd.ms-excel';
  } else if (file.name.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (file.name.endsWith('.pps') || file.name.endsWith('.ppt')) {
    return 'application/vnd.ms-powerpoint';
  } else if (file.name.endsWith('.ppsx') || file.name.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  return 'application/octet-stream';
};

export const fileAsUrl = (file: RcFile): Promise<string | ArrayBuffer | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const fileAsBase64 = (file: RcFile): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) {
        resolve(null);
        return;
      }
      let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
      if (encoded.length % 4 > 0) {
        encoded += '='.repeat(4 - (encoded.length % 4));
      }
      resolve(encoded);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
