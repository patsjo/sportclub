import { observer } from 'mobx-react';
import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { styled } from 'styled-components';

const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const Maps = lazy(() => import('./components/map/Maps'));
const News = lazy(() => import('./components/news/News'));
const UsersAndCompetitors = lazy(() => import('./components/users/UsersAndCompetitors'));
const League = lazy(() => import('./components/results/League'));
const ResultsWizard = lazy(() => import('./components/results/ResultsWizard'));
const InvoiceWizard = lazy(() => import('./components/results/InvoiceWizard'));
const ViewResults = lazy(() => import('./components/results/ViewResults'));
const ResultsFees = lazy(() => import('./components/results/ResultsFees'));
const ResultsStatistics = lazy(() => import('./components/results/ResultsStatistics'));
const WeeklyCalendar = lazy(() => import('./components/calendar/weekly/WeeklyCalendar'));
const MonthlyCalendar = lazy(() => import('./components/calendar/monthly/MonthlyCalendar'));
const EventSelector = lazy(() => import('./components/calendar/eventSelector/EventSelectorWizard'));
const AllSponsors = lazy(() => import('./components/sponsors/AllSponsors'));
const OtherRoutes = lazy(() => import('./components/routes/OhterRoutes'));
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
  return (
    <ContentArea>
      <Routes>
        <Route path="/" element={<Dashboard key="dashboard" />} />
        <Route path="/maps" element={<Maps />} />
        <Route path="/kartor" element={<Maps />} />
        <Route path="/news" element={<News key="news" />} />
        <Route path="/users" element={<UsersAndCompetitors key="users" />} />
        <Route path="/calendar/eventselector" element={<EventSelector key="eventSelector" />} />
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
        <Route path="/results/import" element={<ResultsWizard key="importResult" />} />
        <Route path="/results/verifyinvoice" element={<InvoiceWizard key="verifyInvoiceResult" />} />
        <Route path="/results/individual" element={<ViewResults key="individualViewResult" isIndividual={true} />} />
        <Route path="/results/fees" element={<ResultsFees key="resultsFees" />} />
        <Route path="/results/statistics" element={<ResultsStatistics key="resultsStatistics" />} />
        <Route path="/results" element={<ViewResults key="clubViewResult" isIndividual={false} />} />
        <Route path="/sponsors" element={<AllSponsors key="individualViewResult" />} />
        <Route path="/*" element={<OtherRoutes key="otherRoutes" />} />
      </Routes>
    </ContentArea>
  );
});

export default AppContent;
