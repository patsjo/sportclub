import { UploadFile } from 'antd';

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

export const fileAsUrl = (file: NonNullable<UploadFile['originFileObj']>): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else if (reader.result instanceof ArrayBuffer) {
        // Convert ArrayBuffer → base64 data URL
        const bytes = new Uint8Array(reader.result);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        resolve(`data:${file.type};base64,${btoa(binary)}`);
      } else {
        resolve(null);
      }
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

export const fileAsBase64 = (file: UploadFile['originFileObj']): Promise<string | null> => {
  if (!file) return new Promise(resolve => resolve(null));
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
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};
