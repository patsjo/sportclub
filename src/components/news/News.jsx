import React, { Component } from "react";
import NewsItem from "./NewsItem";
import CircularProgress from "@material-ui/core/CircularProgress";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { GetJsonData } from "../../utils/api";

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

// @inject("clubModel")
// @observer
const News = inject("clubModel")(
  observer(
    class News extends Component {
      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          newsItems: []
        };
      }

      componentDidMount() {
        GetJsonData(
          this.props.clubModel.modules.find(module => module.name === "News")
            .queryUrl
        ).then(json => {
          const newsItems = json !== undefined ? json : [];
          newsItems.forEach(newsItem => {
            newsItem.link = decodeURIComponent(newsItem.link);
          });
          this.setState({
            loaded: true,
            newsItems
          });
        });
      }

      render() {
        const Items = this.state.loaded ? (
          <React.Fragment>
            {this.state.newsItems.map(newsObject => (
              <NewsItem
                key={"newsObject#" + newsObject.id}
                newsObject={newsObject}
              />
            ))}
          </React.Fragment>
        ) : (
          <SpinnerDiv>
            <CircularProgress color="primary" size={50} thickness={5} />
          </SpinnerDiv>
        );
        return Items;
      }
    }
  )
);

export default News;
