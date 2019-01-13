import React, { Component } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import FadeOutItem from "../fadeOutItem/FadeOutItem";
import { observer, inject } from "mobx-react";
import NewsEdit from "./NewsEdit";

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
  padding-left: 10px;
  padding-bottom: 2px;
  max-width: 100%;
  height: auto;
`;

const NewsBy = styled.div`
  font-size: 10px;
  font-weight: normal;
  text-align: right;
  text-color: #606060;
`;

// @inject("clubModel")
// @observer
const NewsItem = inject("clubModel")(
  observer(
    class NewsItem extends Component {
      static propTypes = {
        newsObject: PropTypes.object.isRequired
      };

      constructor(props) {
        super(props);
        this.getImage = this.getImage.bind(this);
      }

      getImage(maxSize) {
        let Image = undefined;
        if (
          this.props.newsObject &&
          this.props.newsObject.imageWidth > 0 &&
          this.props.newsObject.imageHeight > 0
        ) {
          let ImageHeight = this.props.newsObject.imageHeight;
          let ImageWidth = this.props.newsObject.imageWidth;
          if (ImageHeight > maxSize && ImageHeight > ImageWidth) {
            ImageWidth = ImageWidth * (maxSize / ImageHeight);
            ImageHeight = maxSize;
          } else if (ImageWidth > maxSize && ImageWidth > ImageHeight) {
            ImageHeight = ImageHeight * (maxSize / ImageWidth);
            ImageWidth = maxSize;
          }
          Image = (
            <NewsImage
              src={
                this.props.clubModel.attachmentUrl +
                this.props.newsObject.fileId
              }
              width={ImageWidth}
              height={ImageHeight}
            />
          );
        }
        return Image;
      }
      render() {
        const Image = this.getImage(200);
        const ImageBig = this.getImage(400);

        const Header = this.props.newsObject.link ? (
          <NewsHeader>
            <a
              href={this.props.newsObject.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: this.props.newsObject.header
                }}
              />
            </a>
          </NewsHeader>
        ) : (
          <NewsHeader>
            {" "}
            <div
              dangerouslySetInnerHTML={{ __html: this.props.newsObject.header }}
            />
          </NewsHeader>
        );

        return (
          <FadeOutItem
            content={
              <ContentHolder>
                <NewsHeader>
                  {" "}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: this.props.newsObject.header
                    }}
                  />
                </NewsHeader>
                <NewsTime>{this.props.newsObject.modificationDate}</NewsTime>
                {Image}
                <NewsIntroduction>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: this.props.newsObject.introduction
                    }}
                  />
                </NewsIntroduction>
                <NewsText>
                  {" "}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: this.props.newsObject.text
                    }}
                  />
                </NewsText>
                <NewsBy>{this.props.newsObject.modifiedBy}</NewsBy>
              </ContentHolder>
            }
            modalContent={
              <ContentHolder>
                {Header}
                <NewsTime>{this.props.newsObject.modificationDate}</NewsTime>
                {ImageBig}
                <NewsIntroduction>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: this.props.newsObject.introduction
                    }}
                  />
                </NewsIntroduction>
                <NewsText>
                  {" "}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: this.props.newsObject.text
                    }}
                  />
                </NewsText>
                <NewsBy>{this.props.newsObject.modifiedBy}</NewsBy>
              </ContentHolder>
            }
            editFormContent={<NewsEdit newsObject={this.props.newsObject} />}
          />
        );
      }
    }
  )
);
export default NewsItem;
