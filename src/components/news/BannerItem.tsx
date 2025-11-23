import { IChildContainerProps } from '../dashboard/columns/mapNodesToColumns';
import { observer } from 'mobx-react';
import { INewsItem } from '../../models/newsModel';
import React from 'react';
import styled from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { PostJsonData } from '../../utils/api';
import { getImage } from '../../utils/imageHelper';
import FadeOutItem from '../fadeOutItem/FadeOutItem';
import MaterialIcon from '../materialIcon/MaterialIcon';
import NewsEdit from './NewsEdit';

interface IBannerHolderProps {
  hasImage: boolean;
}
const BannerHolder = styled.div<IBannerHolderProps>`
  background-color: ${(props) => (props.hasImage ? 'inherit' : props.theme.palette.primary.main)};
  border-radius: 8px;
  color: ${(props) => (props.hasImage ? 'inherit' : props.theme.palette.primary.contrastText)};
  padding: ${(props) => (props.hasImage ? '0' : '6px')};
  text-align: ${(props) => (props.hasImage ? 'center' : 'inherit')};
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
  const newsModule = React.useMemo(() => clubModel.modules.find((module) => module.name === 'News'), []);
  const Image = React.useMemo(() => getImage(1000, BannerImage, newsObject, clubModel), []);
  const ImageBig = React.useMemo(() => getImage(400, NewsImage, newsObject, clubModel), []);

  const FileDownload =
    newsObject && (!newsObject.imageWidth || !newsObject.imageHeight) && newsObject.fileId ? (
      <FloatRightAnchor href={clubModel.attachmentUrl + newsObject.fileId} target="_blank">
        <MaterialIcon icon="download" fontSize={24} />
      </FloatRightAnchor>
    ) : null;

  const Header = newsObject.link ? (
    <NewsHeader>
      {FileDownload}
      <a href={newsObject.link} target="_blank" rel="noopener noreferrer">
        {newsObject.header}
      </a>
    </NewsHeader>
  ) : (
    <NewsHeader>
      {FileDownload}
      {newsObject.header}
    </NewsHeader>
  );

  return newsModule && (sessionModel.loggedIn || !newsObject.link) ? (
    <FadeOutItem
      ref={ref}
      paddingBottom={0}
      module={newsModule}
      content={
        <BannerHolder hasImage={Image != null}>
          {Image ? Image : <NewsHeader>{newsObject.header}</NewsHeader>}
        </BannerHolder>
      }
      modalContent={
        <ContentHolder>
          {Header}
          <NewsTime>{newsObject.modificationDate}</NewsTime>
          {ImageBig}
          <NewsIntroduction>{newsObject.introduction}</NewsIntroduction>
          <NewsText>{newsObject.text}</NewsText>
          <NewsBy>{newsObject.modifiedBy}</NewsBy>
        </ContentHolder>
      }
      modalColumns={3}
      editFormContent={
        <NewsEdit newsObject={newsObject} onChange={(updatedNewsObject) => newsObject.setValues(updatedNewsObject)} />
      }
      deletePromise={() =>
        PostJsonData(
          newsModule.deleteUrl,
          {
            iNewsID: newsObject.id,
            username: sessionModel.username,
            password: sessionModel.password,
          },
          true,
          sessionModel.authorizationHeader,
        )
      }
      onDelete={() => globalStateModel.news?.removeNewsItem(newsObject)}
    />
  ) : (
    <a href={newsObject.link ? newsObject.link : undefined} target="_blank" rel="noopener noreferrer">
      <BannerHolder hasImage={Image != null}>
        {Image ? Image : <NewsHeader>{newsObject.header}</NewsHeader>}
      </BannerHolder>
    </a>
  );
});
export default BannerItem;
