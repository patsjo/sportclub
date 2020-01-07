import React, { Component } from "react";
import PropTypes from "prop-types";
import NewsItem from "./NewsItem";
import { Spin } from "antd";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { PostJsonData } from "../../utils/api";
import Columns from "../dashboard/columns/Columns";
import InfiniteScroll from "react-infinite-scroller";

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

// @inject("clubModel")
// @observer
const News = inject(
  "clubModel",
  "globalStateModel"
)(
  observer(
    class News extends Component {
      static propTypes = {
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        type: PropTypes.number,
        infiniteScroll: PropTypes.bool
      };

      constructor(props) {
        super(props);
        this.state = { firstLoading: true };
        props.globalStateModel.news.reset();
        if (!props.infiniteScroll) {
          this.loadNews();
        }
      }

      componentDidUpdate(prevProps) {
        const { startDate, endDate, type, globalStateModel, infiniteScroll } = this.props;
        if (prevProps.startDate !== startDate || prevProps.endDate !== endDate || prevProps.type !== type) {
          globalStateModel.news.reset();
          if (!infiniteScroll) {
            this.loadNews();
          }
        }
      }

      loadNews() {
        const self = this;
        const url = this.props.clubModel.modules.find(module => module.name === "News").queryUrl;
        const { startDate, endDate, type, globalStateModel } = this.props;
        const { limit, offset } = globalStateModel.news;
        const data = {
          iStartDate: startDate ? startDate : "",
          iEndDate: endDate ? endDate : "",
          iNewsTypeID: type ? type : "",
          offset: offset,
          limit: limit
        };

        PostJsonData(url, data, false).then(json => {
          // eslint-disable-next-line eqeqeq
          const newArray = json != undefined ? json : [];
          newArray.forEach(newsItem => {
            newsItem.link = decodeURIComponent(newsItem.link);
          });
          globalStateModel.news.addNewsItemsToBottom(newArray);
          self.setState({ firstLoading: false });
        });
      }

      render() {
        const { firstLoading } = this.state;
        const { infiniteScroll, globalStateModel } = this.props;
        const { newsItems, hasMoreItems } = globalStateModel.news;

        return infiniteScroll ? (
          <InfiniteScroll
            pageStart={0}
            loadMore={this.loadNews.bind(this)}
            hasMore={hasMoreItems}
            loader={
              <SpinnerDiv>
                <Spin size="large" />
              </SpinnerDiv>
            }
          >
            <Columns>
              {newsItems.map(newsObject => (
                <NewsItem key={"newsObject#" + newsObject.id} newsObject={newsObject} />
              ))}
            </Columns>
          </InfiniteScroll>
        ) : !firstLoading ? (
          <>
            {newsItems.map(newsObject => (
              <NewsItem key={"newsObject#" + newsObject.id} newsObject={newsObject} />
            ))}
          </>
        ) : (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        );
      }
    }
  )
);

export default News;
