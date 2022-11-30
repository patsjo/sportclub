import { IChildContainerProps } from 'components/dashboard/columns/mapNodesToColumns';
import { observer } from 'mobx-react';
import { INewsItem } from 'models/newsModel';
import React from 'react';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { PostJsonData } from '../../utils/api';
import { getImage } from '../../utils/imageHelper';
import FadeOutItem from '../fadeOutItem/FadeOutItem';
import MaterialIcon from '../materialIcon/MaterialIcon';
import NewsEdit from './NewsEdit';

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
  const newsModule = React.useMemo(() => clubModel.modules.find((module) => module.name === 'News'), []);
  const Image = React.useMemo(() => getImage(200, NewsImage, newsObject, clubModel), []);
  const ImageBig = React.useMemo(() => getImage(400, NewsImage, newsObject, clubModel), []);

  const FileDownload =
    newsObject && (!newsObject.imageWidth || !newsObject.imageHeight) && newsObject.fileId ? (
      <FloatRightAnchor href={clubModel.attachmentUrl + newsObject.fileId} target="_blank">
        <MaterialIcon icon="download" fontSize={24} />
      </FloatRightAnchor>
    ) : null;

  return newsModule ? (
    <FadeOutItem
      ref={ref}
      module={newsModule}
      content={
        <ContentHolder>
          <NewsHeader>
            {FileDownload}
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
            {FileDownload}
            {newsObject.header}
          </NewsHeader>
          <NewsTime>{newsObject.modificationDate}</NewsTime>
          {ImageBig}
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
      modalColumns={4}
      editFormContent={
        <NewsEdit newsObject={newsObject} onChange={(updatedNewsObject) => newsObject.setValues(updatedNewsObject)} />
      }
      deletePromise={() =>
        PostJsonData(
          newsModule?.deleteUrl,
          {
            iNewsID: newsObject.id,
            username: sessionModel.username,
            password: sessionModel.password,
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
