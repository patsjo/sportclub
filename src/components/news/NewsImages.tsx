import { Image } from 'antd';
import { observer } from 'mobx-react';
import { styled } from 'styled-components';
import { INewsFileProps } from '../../models/newsModel';
import { getImageSize } from '../../utils/imageHelper';
import { useMobxStore } from '../../utils/mobxStore';

const ImageHolder = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  break-inside: avoid-column;
  page-break-inside: avoid;
  -webkit-column-break-inside: avoid;
`;

const StyledImage = styled(Image)`
  &&& {
    max-width: 100%;
    height: auto;
    cursor: zoom-in;
  }
`;

interface INewsImagesProps {
  files: INewsFileProps[];
  maxSize: number;
}

const NewsImages = observer(({ files, maxSize }: INewsImagesProps) => {
  const { clubModel } = useMobxStore();
  const images = files
    .map(file => ({ file, size: getImageSize(maxSize, file) }))
    .filter((image): image is { file: INewsFileProps; size: { width: number; height: number } } => image.size != null);

  return images.length ? (
    <ImageHolder>
      <Image.PreviewGroup>
        {images.map(({ file, size }) => (
          <StyledImage
            key={`newsImage#${file.fileId}`}
            src={clubModel.attachmentUrl + file.fileId}
            alt={file.fileName ?? undefined}
            width={size.width}
            height={size.height}
          />
        ))}
      </Image.PreviewGroup>
    </ImageHolder>
  ) : null;
});

export default NewsImages;
