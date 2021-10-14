import { Button, message, Spin, Tabs } from 'antd';
import { observer } from 'mobx-react';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { ICompetitor } from 'utils/responseCompetitorInterfaces';
import { GenderType } from 'utils/resultConstants';
import { PostJsonData } from '../../utils/api';
import InfiniteScroll from '../../utils/infinityScroll';
import { SpinnerDiv } from '../styled/styled';
import CompetitorPresentation from './CompetitorPresentation';
import { StarsInfoModal } from './StarsInfoModal';

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

const AllCompetitorsPresentation = observer(() => {
  const { clubModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [maleCompetitors, setMaleCompetitors] = useState<ICompetitor[]>([]);
  const [femaleCompetitors, setFemaleCompetitors] = useState<ICompetitor[]>([]);
  const [viewNumberOf, setViewNumberOf] = useState(0);
  const [gender, setGender] = useState<GenderType>('MALE');

  useEffect(() => {
    const currentYear = parseInt(moment().format('YYYY'));
    const fromDate = moment().add(1, 'days').subtract(1, 'years').format('YYYY-MM-DD');
    const birthDate = moment(currentYear, 'YYYY').subtract(14, 'years').subtract(1, 'days').format('YYYY-MM-DD');
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url) return;

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
      .then((competitors: ICompetitor[]) => {
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
    return new Promise<void>((resolve) => resolve());
  }, []);

  const infoButton = <Button onClick={() => StarsInfoModal(t, gender)}>Info</Button>;

  return (
    <InfiniteScroll
      key="InfiniteScroll#competitorPresentation"
      loadMore={loadMoreCallback}
      hasMore={viewNumberOf < Math.max(maleCompetitors.length, femaleCompetitors.length)}
    >
      <StyledTabs
        defaultActiveKey={gender}
        tabBarExtraContent={infoButton}
        onChange={(value) => setGender(value as GenderType)}
      >
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
});

export default AllCompetitorsPresentation;
