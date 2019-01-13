import React, { Component } from "react";
import styled from "styled-components";
import News from "../news/News";
import EventorEntriesView from "../eventor/EventorEntriesView";
import { observer, inject } from "mobx-react";

const ContentArea = styled.div`
  & {
    margin-top: 20px;
    margin-left: 8px;
    margin-right: 8px;
    -webkit-columns: 5 300px;
    -moz-columns: 5 300px;
    columns: 5 300px;
    -webkit-column-gap: 1em;
    -moz-column-gap: 1em;
    column-gap: 1em;
    -webkit-column-rule: 1px dotted #ccc;
    -moz-column-rule: 1px dotted #ccc;
    column-rule: 1px dotted #ccc;
  }
`;

// @inject("clubModel")
// @observer
const Dashboard = inject("clubModel")(
  observer(
    class Dashboard extends Component {
      render() {
        return (
          <ContentArea>
            <News />
            <EventorEntriesView />
          </ContentArea>
        );
      }
    }
  )
);

export default Dashboard;
