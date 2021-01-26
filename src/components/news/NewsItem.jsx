import React, { Component } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import FadeOutItem from '../fadeOutItem/FadeOutItem';
import { observer, inject } from 'mobx-react';
import { applySnapshot } from 'mobx-state-tree';
import NewsEdit from './NewsEdit';
import { PostJsonData } from '../../utils/api';
import withForwardedRef from '../../utils/withForwardedRef';
import MaterialIcon from '../materialIcon/MaterialIcon';
import { getImage } from '../../utils/imageHelper';

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
  font-size: 11px;
  font-weight: bold;
  text-align: justify;
  text-justify: inter-word;
  white-space: pre-line;
`;

const NewsText = styled.div`
  font-size: 11px;
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

// @inject("clubModel")
// @observer
const NewsItem = inject(
  'clubModel',
  'sessionModel',
  'globalStateModel'
)(
  observer(
    class NewsItem extends Component {
      static propTypes = {
        newsObject: PropTypes.object.isRequired,
      };

      constructor(props) {
        super(props);
      }

      getFile() {
        const { newsObject, clubModel } = this.props;

        if (newsObject && (!newsObject.imageWidth || !newsObject.imageHeight) && newsObject.fileId > 0) {
          return (
            <FloatRightAnchor
              href={clubModel.attachmentUrl + newsObject.fileId}
              // eslint-disable-next-line react/jsx-no-target-blank
              target="_blank"
            >
              <MaterialIcon icon="download" fontSize={24} />
            </FloatRightAnchor>
          );
        }
        return null;
      }

      render() {
        const { sessionModel, clubModel, globalStateModel, forwardedRef, newsObject } = this.props;
        const moduleInfo = clubModel.module('News');
        const FileDownload = this.getFile();
        const Image = getImage(200, NewsImage, newsObject, clubModel);
        const ImageBig = getImage(400, NewsImage, newsObject, clubModel);

        const Header = (
          <NewsHeader>
            {FileDownload}
            <div dangerouslySetInnerHTML={{ __html: newsObject.header }} />
          </NewsHeader>
        );

        const ReadMore = newsObject.link ? (
          <NewsReadMore>
            <a href={newsObject.link} target="_blank" rel="noopener noreferrer">
              Läs mer...
            </a>
          </NewsReadMore>
        ) : null;

        return (
          <FadeOutItem
            ref={forwardedRef}
            module={moduleInfo}
            content={
              <ContentHolder>
                <NewsHeader>
                  {FileDownload}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: newsObject.header,
                    }}
                  />
                </NewsHeader>
                <NewsTime>{newsObject.modificationDate}</NewsTime>
                {Image}
                <NewsIntroduction>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: newsObject.introduction,
                    }}
                  />
                </NewsIntroduction>
                <NewsText>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: newsObject.text,
                    }}
                  />
                </NewsText>
                <NewsBy>{newsObject.modifiedBy}</NewsBy>
              </ContentHolder>
            }
            modalContent={
              <ContentHolder>
                {Header}
                <NewsTime>{newsObject.modificationDate}</NewsTime>
                {ImageBig}
                <NewsIntroduction>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: newsObject.introduction,
                    }}
                  />
                </NewsIntroduction>
                <NewsText>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: newsObject.text,
                    }}
                  />
                </NewsText>
                {ReadMore}
                <NewsBy>{newsObject.modifiedBy}</NewsBy>
              </ContentHolder>
            }
            modalColumns={4}
            editFormContent={
              <NewsEdit
                newsObject={newsObject}
                onChange={(updatedNewsObject) => applySnapshot(newsObject, updatedNewsObject)}
              />
            }
            deletePromise={() =>
              PostJsonData(
                moduleInfo.deleteUrl,
                {
                  iNewsID: newsObject.id,
                  username: sessionModel.username,
                  password: sessionModel.password,
                },
                true,
                sessionModel.authorizationHeader
              )
            }
            onDelete={() => globalStateModel.news.removeNewsItem(newsObject)}
          />
        );
      }
    }
  )
);
export default withForwardedRef(NewsItem);
