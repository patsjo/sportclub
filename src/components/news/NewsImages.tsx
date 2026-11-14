import { Image } from 'antd';
import { observer } from 'mobx-react';
import { styled } from 'styled-components';
import { INewsFileProps } from '../../models/newsModel';
import { getImageSize } from '../../utils/imageHelper';
import { useMobxStore } from '../../utils/mobxStore';

const ImageHolder = styled.div<{ $floatRight?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  break-inside: avoid-column;
  page-break-inside: avoid;
  -webkit-column-break-inside: avoid;
  max-width: 100%;
  ${({ $floatRight }) => ($floatRight ? 'float: right; margin-left: 10px; margin-bottom: 2px;' : '')}
`;

const StyledImage = styled(Image)`
  &&& {
    cursor: zoom-in;
  }
`;

/**
 * Image sets the height as inline style on both the wrapper and the image, so it has to be overridden the same way.
 * Otherwise the image is stretched when the width is limited by a narrow column.
 */
const imageStyles = {
  root: { maxWidth: '100%', height: 'auto' },
  image: { maxWidth: '100%', height: 'auto' }
};

interface INewsImagesProps {
  files: INewsFileProps[];
  maxSize: number;
  /** Let the text flow beside the image, used when there is only one image */
  floatRight?: boolean;
}

const NewsImages = observer(({ files, maxSize, floatRight }: INewsImagesProps) => {
  const { clubModel } = useMobxStore();
  const images = files
    .map(file => ({ file, size: getImageSize(maxSize, file) }))
    .filter((image): image is { file: INewsFileProps; size: { width: number; height: number } } => image.size != null);

  return images.length ? (
    <ImageHolder $floatRight={floatRight}>
      <Image.PreviewGroup>
        {images.map(({ file, size }) => (
          <StyledImage
            key={`newsImage#${file.fileId}`}
            src={clubModel.attachmentUrl + file.fileId}
            alt={file.fileName ?? undefined}
            width={size.width}
            height={size.height}
            styles={imageStyles}
          />
        ))}
      </Image.PreviewGroup>
    </ImageHolder>
  ) : null;
});

export default NewsImages;
