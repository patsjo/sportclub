import React from "react";
import { getFileType } from "./fileHelper";
import { Select } from "antd";

const Option = Select.Option;

export const dateFormat = "YYYY-MM-DD";
export const timeFormat = "HH:mm:ss";
export const timeFormatWithoutHour = "mm:ss";
export const shortTimeFormat = "HH:mm";
export const maxByteSize = 10485760;

export const FormSelect = ({ options, ...props }) => {
  return (
    <Select {...props}>
      {options.map(option => (
        <Option value={option.code}>{option.description}</Option>
      ))}
    </Select>
  );
};

export const normFile = file => {
  // eslint-disable-next-line eqeqeq
  if (FileReader.prototype.readAsBinaryString == undefined) {
    FileReader.prototype.readAsBinaryString = function(fileData) {
      let binary = "";
      let pt = this;
      let reader = new FileReader();
      reader.onload = function() {
        let bytes = new Uint8Array(reader.result);
        let length = bytes.byteLength;
        for (let i = 0; i < length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        //pt.result  - readonly so assign content to another property
        pt.content = binary;
        pt.onload();
      };
      reader.readAsArrayBuffer(fileData);
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      let data;
      if (!e) {
        data = reader.content;
      } else {
        data = e.target.result;
      }

      resolve({
        uid: file.uid,
        fileName: file.name,
        base64Content: btoa(data),
        contentType: getFileType(file),
        originalFile: file.originalFile,
        originFileObj: file.originFileObj
      });
    };
    reader.readAsBinaryString(file.originFileObj);
  });
};

export const hasErrors = fieldsError => {
  return Object.keys(fieldsError).some(field => fieldsError[field]);
};

export const errorRequiredField = (t, i18nField) => {
  return `${t("error.RequiredField")} ${t(i18nField).toLowerCase()}`;
};
