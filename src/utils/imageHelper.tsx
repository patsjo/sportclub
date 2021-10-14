import { IMobxClubModel } from 'models/mobxClubModel';
import { INewsItemSnapshotIn } from 'models/newsModel';
import React, { ReactElement } from 'react';
import { StyledComponent } from 'styled-components';

export const getImage = (
  maxSize: number,
  ImageComp: StyledComponent<'img', any, any, never>,
  newsObject: INewsItemSnapshotIn,
  clubModel: IMobxClubModel
): ReactElement<any, any> | null => {
  let Image: ReactElement<any, any> | null = null;
  if (newsObject.imageWidth && newsObject.imageHeight && newsObject.imageWidth > 0 && newsObject.imageHeight > 0) {
    let ImageHeight = newsObject.imageHeight;
    let ImageWidth = newsObject.imageWidth;
    if (ImageHeight > maxSize && ImageHeight > ImageWidth) {
      ImageWidth = ImageWidth * (maxSize / ImageHeight);
      ImageHeight = maxSize;
    } else if (ImageWidth > maxSize && ImageWidth >= ImageHeight) {
      ImageHeight = ImageHeight * (maxSize / ImageWidth);
      ImageWidth = maxSize;
    }
    Image = <ImageComp src={clubModel.attachmentUrl + newsObject.fileId} width={ImageWidth} height={ImageHeight} />;
  }
  return Image;
};
