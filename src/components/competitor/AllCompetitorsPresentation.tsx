import { Button, message, Spin, Tabs } from 'antd';
import { observer } from 'mobx-react';
import moment from 'moment';
import { useCallback, useMemo, useRef, useState } from 'react';
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
  const [gender, setGender] = useState<GenderType>('MALE');
  const viewNumberOfRef = useRef(0);
  const viewMaxNumberOfRef = useRef(0);
  const [viewNumberOf, setViewNumberOf] = useState(0);
  const viewMaleCompetitors = useMemo(() => maleCompetitors.slice(0, viewNumberOf), [viewNumberOf]);
  const viewFemaleCompetitors = useMemo(() => femaleCompetitors.slice(0, viewNumberOf), [viewNumberOf]);

  const loadMoreCallback = useCallback((): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (viewNumberOfRef.current > 0) {
        viewNumberOfRef.current += 10;
        setViewNumberOf(viewNumberOfRef.current);
        resolve(viewNumberOfRef.current < viewMaxNumberOfRef.current);
        return;
      }

      const currentYear = parseInt(moment().format('YYYY'));
      const fromDate = moment().add(1, 'days').subtract(1, 'years').format('YYYY-MM-DD');
      const birthDate = moment(currentYear, 'YYYY').subtract(14, 'years').subtract(1, 'days').format('YYYY-MM-DD');
      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      if (!url) {
        resolve(false);
        return;
      }

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
          const mc = competitors.filter((c) => c.gender === 'MALE');
          const fc = competitors.filter((c) => c.gender === 'FEMALE');
          setMaleCompetitors(mc);
          setFemaleCompetitors(fc);
          viewNumberOfRef.current = 10;
          viewMaxNumberOfRef.current = Math.max(mc.length, fc.length);
          setViewNumberOf(viewNumberOfRef.current);
          setLoading(false);
          resolve(viewNumberOfRef.current < viewMaxNumberOfRef.current);
        })
        .catch((e) => {
          if (e && e.message) {
            message.error(e.message);
          }
          reject(e);
        });
    });
  }, []);

  const infoButton = <Button onClick={() => StarsInfoModal(t, gender)}>Info</Button>;

  return (
    <InfiniteScroll key="InfiniteScroll#competitorPresentation" loadMore={loadMoreCallback}>
      <StyledTabs
        defaultActiveKey={gender}
        tabBarExtraContent={infoButton}
        onChange={(value) => setGender(value as GenderType)}
      >
        <TabPane tab={t('results.Male')} key="MALE">
          {!loading ? (
            <div>
              {viewMaleCompetitors.map((c) => (
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
              {viewFemaleCompetitors.map((c) => (
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
