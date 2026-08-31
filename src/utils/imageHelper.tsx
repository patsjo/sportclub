import { ReactElement } from 'react';
import { IStyledComponent } from 'styled-components';
import { IMobxClubModel } from '../models/mobxClubModel';
import { INewsFileProps } from '../models/newsModel';

export const getImageSize = (
  maxSize: number,
  file: Pick<INewsFileProps, 'imageWidth' | 'imageHeight'> | undefined
): { width: number; height: number } | null => {
  if (!file?.imageWidth || !file.imageHeight || file.imageWidth <= 0 || file.imageHeight <= 0) return null;

  let height = file.imageHeight;
  let width = file.imageWidth;
  if (height > maxSize && height > width) {
    width = width * (maxSize / height);
    height = maxSize;
  } else if (width > maxSize && width >= height) {
    height = height * (maxSize / width);
    width = maxSize;
  }
  return { width, height };
};

export const getImage = (
  maxSize: number,
  ImageComp: IStyledComponent<'web', { src?: string; width?: string | number; height?: string | number }>,
  file: INewsFileProps | undefined,
  clubModel: IMobxClubModel
): ReactElement | null => {
  const size = getImageSize(maxSize, file);
  if (!size || !file) return null;

  return <ImageComp src={clubModel.attachmentUrl + file.fileId} width={size.width} height={size.height} />;
};
