import React, { lazy } from 'react';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';
import { Switch, Route, useLocation } from 'react-router-dom';
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const News = lazy(() => import('./components/news/News'));
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

const AppContent = inject(
  'clubModel',
  'globalStateModel'
)(
  observer(({ clubModel, globalStateModel }) => {
    const location = useLocation();

    return (
      <ContentArea>
        <Switch>
          <Route exact path="/news">
            <News />
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
            <League />
          </Route>
          <Route exact path="/competitor/presentation">
            <AllCompetitorsPresentation />
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
            <AllSponsors key="individualViewResult" isIndividual />
          </Route>
          <Route exact path="/">
            <Dashboard />
          </Route>
          <Route path="*">
            <HtmlEditor key="htmlEditor" path={location.pathname} />
          </Route>
        </Switch>
      </ContentArea>
    );
  })
);

export default AppContent;
