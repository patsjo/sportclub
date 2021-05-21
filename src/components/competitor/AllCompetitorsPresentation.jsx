import React, { useState, useEffect, useCallback } from 'react';
import CompetitorPresentation from './CompetitorPresentation';
import { useTranslation } from 'react-i18next';
import { observer, inject } from 'mobx-react';
import { Spin, Tabs, message, Button } from 'antd';
import { SpinnerDiv } from '../styled/styled';
import InfiniteScroll from '../../utils/infinityScroll';
import moment from 'moment';
import { PostJsonData } from '../../utils/api';
import { StarsInfoModal } from './StarsInfoModal';
import styled from 'styled-components';

const { TabPane } = Tabs;

const StyledTabs = styled(Tabs)`
  &&& {
    max-width: 1160px;
  }
`;

const Spinner = (
  <SpinnerDiv>
    <Spin size="large" />
  </SpinnerDiv>
);

const AllCompetitorsPresentation = inject(
  'clubModel',
  'sessionModel'
)(
  observer(({ clubModel, sessionModel }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [maleCompetitors, setMaleCompetitors] = useState([]);
    const [femaleCompetitors, setFemaleCompetitors] = useState([]);
    const [viewNumberOf, setViewNumberOf] = useState(0);
    const [gender, setGender] = useState('MALE');

    useEffect(() => {
      const currentYear = parseInt(moment().format('YYYY'));
      const fromDate = moment().add(1, 'days').subtract(1, 'years').format('YYYY-MM-DD');
      const birthDate = moment(currentYear, 'YYYY').subtract(14, 'years').subtract(1, 'days').format('YYYY-MM-DD');
      const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;

      PostJsonData(
        url,
        {
          iType: 'TOP',
          iFromDate: fromDate,
          iBirthDate: birthDate,
        },
        true,
        sessionModel.authorizationHeader
      )
        .then((competitors) => {
          setMaleCompetitors(competitors.filter((c) => c.gender === 'MALE'));
          setFemaleCompetitors(competitors.filter((c) => c.gender === 'FEMALE'));
          setViewNumberOf(10);
          setLoading(false);
        })
        .catch((e) => {
          if (e && e.message) {
            message.error(e.message);
          }
        });
    }, []);

    const loadMoreCallback = useCallback(() => {
      setViewNumberOf((nof) => nof + 10);
      return new Promise((resolve) => resolve());
    }, []);

    const infoButton = <Button onClick={() => StarsInfoModal(t, gender)}>Info</Button>;

    return (
      <InfiniteScroll
        key="InfiniteScroll#competitorPresentation"
        pageStart={0}
        loadMore={loadMoreCallback}
        hasMore={viewNumberOf < Math.max(maleCompetitors.length, femaleCompetitors.length)}
        loader={
          <SpinnerDiv key="InfiniteScrollSpinner#competitorPresentation">
            <Spin size="large" />
          </SpinnerDiv>
        }
      >
        <StyledTabs defaultActiveKey={gender} tabBarExtraContent={infoButton} onChange={setGender}>
          <TabPane tab={t('results.Male')} key="MALE">
            {!loading ? (
              <div>
                {maleCompetitors.slice(0, viewNumberOf).map((c) => (
                  <CompetitorPresentation
                    key={`competitorPresentation#${c.competitorId}`}
                    competitor={c}
                    ranking={c.ranking}
                  />
                ))}
              </div>
            ) : (
              Spinner
            )}
          </TabPane>
          <TabPane tab={t('results.FeMale')} key="FEMALE">
            {!loading ? (
              <div>
                {femaleCompetitors.slice(0, viewNumberOf).map((c) => (
                  <CompetitorPresentation
                    key={`competitorPresentation#${c.competitorId}`}
                    competitor={c}
                    ranking={c.ranking}
                  />
                ))}
              </div>
            ) : (
              Spinner
            )}
          </TabPane>
        </StyledTabs>
      </InfiniteScroll>
    );
  })
);

export default AllCompetitorsPresentation;
