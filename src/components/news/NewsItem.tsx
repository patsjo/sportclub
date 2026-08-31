import { observer } from 'mobx-react';
import React from 'react';
import { styled } from 'styled-components';
import { INewsItem } from '../../models/newsModel';
import { PostJsonData } from '../../utils/api';
import { getImage } from '../../utils/imageHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { IChildContainerProps } from '../dashboard/columns/mapNodesToColumns';
import FadeOutItem from '../fadeOutItem/FadeOutItem';
import MaterialIcon from '../materialIcon/MaterialIcon';
import NewsEdit from './NewsEdit';
import NewsImages from './NewsImages';

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
  font-weight: 600;
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

const NewsImage = styled.img`
  float: right;
  margin-left: 10px;
  margin-bottom: 2px;
  max-width: 100%;
  height: auto;
`;

const NewsReadMore = styled.div`
  font-size: 14px;
  font-weight: bold;
  text-align: left;
  cursor: pointer;
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

interface INewsItemProps extends IChildContainerProps {
  ref?: React.ForwardedRef<HTMLDivElement>;
  newsObject: INewsItem;
}
const NewsItem = observer(({ ref, newsObject }: INewsItemProps) => {
  const { globalStateModel, clubModel, sessionModel } = useMobxStore();
  const newsModule = React.useMemo(() => clubModel.modules.find(module => module.name === 'News'), [clubModel.modules]);
  const Image = React.useMemo(
    () => getImage(200, NewsImage, newsObject.files[0], clubModel),
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
        key={`newsFile#${file.fileId}`}
        href={clubModel.attachmentUrl + file.fileId}
        title={file.fileName ?? undefined}
        target="_blank"
      >
        <MaterialIcon icon="download" fontSize={24} />
      </FloatRightAnchor>
    ));

  return newsModule ? (
    <FadeOutItem
      key={`news-fadeoutitem-${newsObject.id}`}
      ref={ref}
      module={newsModule}
      content={
        <ContentHolder>
          <NewsHeader>
            {FileDownloads}
            {newsObject.header}
          </NewsHeader>
          <NewsTime>{newsObject.modificationDate}</NewsTime>
          {Image}
          <NewsIntroduction>{newsObject.introduction}</NewsIntroduction>
          <NewsText>{newsObject.text}</NewsText>
          <NewsBy>{newsObject.modifiedBy}</NewsBy>
        </ContentHolder>
      }
      modalContent={
        <ContentHolder>
          <NewsHeader>
            {FileDownloads}
            {newsObject.header}
          </NewsHeader>
          <NewsTime>{newsObject.modificationDate}</NewsTime>
          {ImagesBig}
          <NewsIntroduction>{newsObject.introduction}</NewsIntroduction>
          <NewsText>{newsObject.text}</NewsText>
          {newsObject.link ? (
            <NewsReadMore>
              <a href={newsObject.link} target="_blank" rel="noopener noreferrer">
                Läs mer...
              </a>
            </NewsReadMore>
          ) : null}
          <NewsBy>{newsObject.modifiedBy}</NewsBy>
        </ContentHolder>
      }
      modalColumns={newsObject.files.length > 1 ? 1 : 4}
      editFormContent={
        <NewsEdit newsObject={newsObject} onChange={updatedNewsObject => newsObject.setValues(updatedNewsObject)} />
      }
      deletePromise={() =>
        PostJsonData(
          newsModule?.deleteUrl,
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
  ) : null;
});

export default NewsItem;
