import React, { lazy } from 'react';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';
import { dashboardContents } from './models/globalStateModel';
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const News = lazy(() => import('./components/news/News'));
const League = lazy(() => import('./components/results/League'));
const ViewResults = lazy(() => import('./components/results/ViewResults'));
const ResultsFees = lazy(() => import('./components/results/ResultsFees'));
const WeeklyCalendar = lazy(() => import('./components/calendar/weekly/WeeklyCalendar'));
const MonthlyCalendar = lazy(() => import('./components/calendar/monthly/MonthlyCalendar'));
const AllSponsors = lazy(() => import('./components/sponsors/AllSponsors'));
const HtmlEditor = lazy(() => import('./components/htmlEditor/HtmlEditor'));

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
    const Content =
      globalStateModel.dashboardContentId === dashboardContents.home ? (
        <Dashboard />
      ) : globalStateModel.dashboardContentId === dashboardContents.news ? (
        <News />
      ) : globalStateModel.dashboardContentId === dashboardContents.calendar ? (
        <>
          <NoMonthlyContainer>
            <WeeklyCalendar />
          </NoMonthlyContainer>
          <MonthlyCalendar />
        </>
      ) : globalStateModel.dashboardContentId === dashboardContents.scoringBoard ? (
        <League />
      ) : globalStateModel.dashboardContentId === dashboardContents.results ? (
        <ViewResults key="clubViewResult" isIndividual={false} />
      ) : globalStateModel.dashboardContentId === dashboardContents.individualResults ? (
        <ViewResults key="individualViewResult" isIndividual={true} />
      ) : globalStateModel.dashboardContentId === dashboardContents.resultsFees ? (
        <ResultsFees key="resultsFees" />
      ) : globalStateModel.dashboardContentId === dashboardContents.htmlEditor ? (
        <HtmlEditor key="htmlEditor" loadPageId={globalStateModel.pageId} />
      ) : globalStateModel.dashboardContentId === dashboardContents.ourSponsors ? (
        <AllSponsors key="individualViewResult" isIndividual />
      ) : null;

    return <ContentArea>{Content}</ContentArea>;
  })
);

export default AppContent;
