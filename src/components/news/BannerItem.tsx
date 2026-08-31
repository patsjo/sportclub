import { observer } from 'mobx-react';
import React from 'react';
import { styled } from 'styled-components';
import { IThemeProps } from '../../models/mobxClubModel';
import { INewsItem } from '../../models/newsModel';
import { PostJsonData } from '../../utils/api';
import { getImage } from '../../utils/imageHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { IChildContainerProps } from '../dashboard/columns/mapNodesToColumns';
import FadeOutItem from '../fadeOutItem/FadeOutItem';
import MaterialIcon from '../materialIcon/MaterialIcon';
import NewsEdit from './NewsEdit';
import NewsImages from './NewsImages';

interface IBannerHolderProps {
  'has-image': boolean;
  theme: IThemeProps;
}
const BannerHolder = styled.div<IBannerHolderProps>`
  background-color: ${props => (props['has-image'] ? 'inherit' : props.theme.palette.primary.main)};
  border-radius: 8px;
  color: ${props => (props['has-image'] ? 'inherit' : props.theme.palette.primary.contrastText)};
  padding: ${props => (props['has-image'] ? '0' : '6px')};
  text-align: ${props => (props['has-image'] ? 'center' : 'inherit')};
  margin-bottom: 4px;
`;

const ContentHolder = styled.div``;

const NewsTime = styled.div`
  font-size: 10px;
  font-weight: normal;
  text-align: left;
  text-color: #606060;
`;

const NewsHeader = styled.div`
  font-size: 18px;
  font-weight: bolder;
  text-align: left;
`;

const NewsIntroduction = styled.div`
  font-size: 13px;
  font-weight: bold;
  text-align: justify;
  text-justify: inter-word;
  white-space: pre-line;
`;

const NewsText = styled.div`
  font-size: 12px;
  font-weight: normal;
  text-align: justify;
  text-justify: inter-word;
  white-space: pre-line;
`;

const BannerImage = styled.img`
  width: auto;
  height: auto;
  max-height: 100px;
  max-width: 100%;
`;

const NewsImage = styled.img`
  float: right;
  margin-left: 10px;
  margin-bottom: 2px;
  max-width: 100%;
  height: auto;
`;

const NewsBy = styled.div`
  font-size: 10px;
  font-weight: normal;
  text-align: right;
  text-color: #606060;
`;

const FloatRightAnchor = styled.a`
  float: right;
`;

interface IBannerItemProps extends IChildContainerProps {
  ref?: React.ForwardedRef<HTMLDivElement>;
  newsObject: INewsItem;
}

const BannerItem = observer(({ ref, newsObject }: IBannerItemProps) => {
  const { globalStateModel, clubModel, sessionModel } = useMobxStore();
  const newsModule = React.useMemo(() => clubModel.modules.find(module => module.name === 'News'), [clubModel.modules]);
  const Image = React.useMemo(
    () => getImage(1000, BannerImage, newsObject.files[0], clubModel),
    [clubModel, newsObject.files]
  );
  // One image keeps floating beside the text, several images are shown as a gallery
  const ImagesBig = React.useMemo(
    () =>
      newsObject.files.length > 1 ? (
        <NewsImages files={newsObject.files} maxSize={240} />
      ) : (
        getImage(400, NewsImage, newsObject.files[0], clubModel)
      ),
    [clubModel, newsObject.files]
  );

  const FileDownloads = newsObject.files
    .filter(file => !file.imageWidth || !file.imageHeight)
    .map(file => (
      <FloatRightAnchor
        key={`bannerFile#${file.fileId}`}
        href={clubModel.attachmentUrl + file.fileId}
        title={file.fileName ?? undefined}
        target="_blank"
      >
        <MaterialIcon icon="download" fontSize={24} />
      </FloatRightAnchor>
    ));

  const Header = newsObject.link ? (
    <NewsHeader>
      {FileDownloads}
      <a href={newsObject.link} target="_blank" rel="noopener noreferrer">
        {newsObject.header}
      </a>
    </NewsHeader>
  ) : (
    <NewsHeader>
      {FileDownloads}
      {newsObject.header}
    </NewsHeader>
  );

  return newsModule && (sessionModel.loggedIn || !newsObject.link) ? (
    <FadeOutItem
      ref={ref}
      paddingBottom={0}
      module={newsModule}
      content={
        <BannerHolder has-image={Image != null}>
          {Image ? Image : <NewsHeader>{newsObject.header}</NewsHeader>}
        </BannerHolder>
      }
      modalContent={
        <ContentHolder>
          {Header}
          <NewsTime>{newsObject.modificationDate}</NewsTime>
          {ImagesBig}
          <NewsIntroduction>{newsObject.introduction}</NewsIntroduction>
          <NewsText>{newsObject.text}</NewsText>
          <NewsBy>{newsObject.modifiedBy}</NewsBy>
        </ContentHolder>
      }
      modalColumns={newsObject.files.length > 1 ? 1 : 3}
      editFormContent={
        <NewsEdit newsObject={newsObject} onChange={updatedNewsObject => newsObject.setValues(updatedNewsObject)} />
      }
      deletePromise={() =>
        PostJsonData(
          newsModule.deleteUrl,
          {
            iNewsID: newsObject.id,
            username: sessionModel.username,
            password: sessionModel.password
          },
          true,
          sessionModel.authorizationHeader
        )
      }
      onDelete={() => globalStateModel.news?.removeNewsItem(newsObject)}
    />
  ) : (
    <a href={newsObject.link ? newsObject.link : undefined} target="_blank" rel="noopener noreferrer">
      <BannerHolder has-image={Image != null}>
        {Image ? Image : <NewsHeader>{newsObject.header}</NewsHeader>}
      </BannerHolder>
    </a>
  );
});
export default BannerItem;
