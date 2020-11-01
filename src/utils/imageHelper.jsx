import React from 'react';

export const getImage = (maxSize, ImageComp, newsObject, clubModel) => {
  let Image = undefined;
  if (newsObject && newsObject.imageWidth > 0 && newsObject.imageHeight > 0) {
    let ImageHeight = newsObject.imageHeight;
    let ImageWidth = newsObject.imageWidth;
    if (ImageHeight > maxSize && ImageHeight > ImageWidth) {
      ImageWidth = ImageWidth * (maxSize / ImageHeight);
      ImageHeight = maxSize;
    } else if (ImageWidth > maxSize && ImageWidth > ImageHeight) {
      ImageHeight = ImageHeight * (maxSize / ImageWidth);
      ImageWidth = maxSize;
    }
    Image = <ImageComp src={clubModel.attachmentUrl + newsObject.fileId} width={ImageWidth} height={ImageHeight} />;
  }
  return Image;
};
