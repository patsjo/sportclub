import { observer } from 'mobx-react';
import React, { lazy } from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';
import styled from 'styled-components';
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const News = lazy(() => import('./components/news/News'));
const Users = lazy(() => import('./components/users/Users'));
const League = lazy(() => import('./components/results/League'));
const ViewResults = lazy(() => import('./components/results/ViewResults'));
const ResultsFees = lazy(() => import('./components/results/ResultsFees'));
const WeeklyCalendar = lazy(() => import('./components/calendar/weekly/WeeklyCalendar'));
const MonthlyCalendar = lazy(() => import('./components/calendar/monthly/MonthlyCalendar'));
const AllSponsors = lazy(() => import('./components/sponsors/AllSponsors'));
const HtmlEditor = lazy(() => import('./components/htmlEditor/HtmlEditor'));
const AllCompetitorsPresentation = lazy(() => import('./components/competitor/AllCompetitorsPresentation'));

const NoMonthlyContainer = styled.div`
  & {
    display: block;
  }
  @media screen and (min-width: 1000px) {
    display: none !important;
  }
`;

const ContentArea = styled.div`
  & {
    margin-top: 24px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const AppContent = observer(() => {
  const location = useLocation();

  return (
    <ContentArea>
      <Switch>
        <Route exact path="/news">
          <News key="news" />
        </Route>
        <Route exact path="/users">
          <Users key="users" />
        </Route>
        <Route exact path="/calendar">
          <>
            <NoMonthlyContainer>
              <WeeklyCalendar />
            </NoMonthlyContainer>
            <MonthlyCalendar />
          </>
        </Route>
        <Route exact path="/league">
          <League key="league" />
        </Route>
        <Route exact path="/competitor/presentation">
          <AllCompetitorsPresentation key="allCompetitorsPresentation" />
        </Route>
        <Route exact path="/results/individual">
          <ViewResults key="individualViewResult" isIndividual={true} />
        </Route>
        <Route exact path="/results/fees">
          <ResultsFees key="resultsFees" />
        </Route>
        <Route exact path="/results">
          <ViewResults key="clubViewResult" isIndividual={false} />
        </Route>
        <Route exact path="/sponsors">
          <AllSponsors key="individualViewResult" />
        </Route>
        <Route exact path="/">
          <Dashboard key="dashboard" />
        </Route>
        <Route path="*">
          <HtmlEditor key="htmlEditor" path={location.pathname} />
        </Route>
      </Switch>
    </ContentArea>
  );
});

export default AppContent;
