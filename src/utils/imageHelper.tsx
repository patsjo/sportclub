import { ReactElement } from 'react';
import { IStyledComponent } from 'styled-components';
import { IMobxClubModel } from '../models/mobxClubModel';
import { INewsItemProps } from '../models/newsModel';

export const getImage = (
  maxSize: number,
  ImageComp: IStyledComponent<'web', { src?: string; width?: string | number; height?: string | number }>,
  newsObject: INewsItemProps,
  clubModel: IMobxClubModel
): ReactElement | null => {
  let Image: ReactElement | null = null;
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
