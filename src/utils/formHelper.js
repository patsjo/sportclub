import React from "react";
import { getFileType } from "./fileHelper";
import { Select } from "antd";

const Option = Select.Option;

export const dateFormat = "YYYY-MM-DD";
export const weekFormat = "GGGG-WW";
export const timeFormat = "HH:mm:ss";
export const timeFormatWithoutHour = "mm:ss";
export const shortTimeFormat = "HH:mm";
export const maxByteSize = 10485760;

export const FormSelect = ({ options, ...props }) => {
  return (
    <Select {...props}>
      {options.map((option) => (
        <Option value={option.code}>{option.description}</Option>
      ))}
    </Select>
  );
};

const normFile = (file) => {
  // eslint-disable-next-line eqeqeq
  if (FileReader.prototype.readAsBinaryString == undefined) {
    FileReader.prototype.readAsBinaryString = function (fileData) {
      let binary = "";
      let pt = this;
      let reader = new FileReader();
      reader.onload = function () {
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
    reader.onload = (e) => {
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
    if (file.originFileObj) {
      reader.readAsBinaryString(file.originFileObj);
    } else {
      resolve(file);
    }
  });
};

export const normFiles = ({ fileList }) => {
  const promises = fileList.map(normFile);

  return new Promise((resolve, reject) => {
    Promise.all(promises)
      .then((files) => resolve(files))
      .catch((e) => reject(e));
  });
};

export const hasErrors = (form) =>
  new Promise((resolve) => {
    if (!form) {
      resolve(true);
      return;
    }
    form
      .validateFields(undefined, {
        force: true
      })
      .then(() => resolve(false))
      .catch((e) => resolve(e.errorFields.length > 0));
  });

export const errorRequiredField = (t, i18nField) => `${t("error.RequiredField")} ${t(i18nField).toLowerCase()}`;
