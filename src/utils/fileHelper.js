export const getFileType = file => {
  if (file.type) {
    return file.type;
  } else if (file.name.endsWith(".doc")) {
    return "application/msword";
  } else if (file.name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (file.name.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  } else if (file.name.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else if (file.name.endsWith(".pps") || file.name.endsWith(".ppt")) {
    return "application/vnd.ms-powerpoint";
  } else if (file.name.endsWith(".ppsx") || file.name.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
};
