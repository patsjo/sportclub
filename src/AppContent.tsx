import { observer } from 'mobx-react';
import { lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
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
      <Routes>
        <Route path="/news" element={<News key="news" />} />
        <Route path="/users" element={<Users key="users" />} />
        <Route
          path="/calendar"
          element={
            <>
              <NoMonthlyContainer>
                <WeeklyCalendar />
              </NoMonthlyContainer>
              <MonthlyCalendar />
            </>
          }
        />
        <Route path="/league" element={<League key="league" />} />
        <Route
          path="/competitor/presentation"
          element={<AllCompetitorsPresentation key="allCompetitorsPresentation" />}
        />
        <Route path="/results/individual" element={<ViewResults key="individualViewResult" isIndividual={true} />} />
        <Route path="/results/fees" element={<ResultsFees key="resultsFees" />} />
        <Route path="/results" element={<ViewResults key="clubViewResult" isIndividual={false} />} />
        <Route path="/sponsors" element={<AllSponsors key="individualViewResult" />} />
        <Route path="/" element={<Dashboard key="dashboard" />} />
        <Route path="*" element={<HtmlEditor key="htmlEditor" path={location.pathname} />} />
      </Routes>
    </ContentArea>
  );
});

export default AppContent;
