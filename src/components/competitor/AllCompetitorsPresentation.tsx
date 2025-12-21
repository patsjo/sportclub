import { Button, message, Modal, Spin, Tabs } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { PostJsonData } from '../../utils/api';
import InfiniteScroll from '../../utils/infinityScroll';
import { useMobxStore } from '../../utils/mobxStore';
import { ICompetitor } from '../../utils/responseCompetitorInterfaces';
import { GenderType } from '../../utils/resultConstants';
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
  const viewMaleCompetitors = useMemo(() => maleCompetitors.slice(0, viewNumberOf), [maleCompetitors, viewNumberOf]);
  const viewFemaleCompetitors = useMemo(
    () => femaleCompetitors.slice(0, viewNumberOf),
    [femaleCompetitors, viewNumberOf]
  );
  const [modal, contextHolder] = Modal.useModal();

  const loadMoreCallback = useCallback((): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (viewNumberOfRef.current > 0) {
        viewNumberOfRef.current += 10;
        setViewNumberOf(viewNumberOfRef.current);
        resolve(viewNumberOfRef.current < viewMaxNumberOfRef.current);
        return;
      }

      const currentYear = dayjs().format('YYYY');
      const fromDate = dayjs().add(1, 'days').subtract(1, 'years').format('YYYY-MM-DD');
      const birthDate = dayjs(currentYear, 'YYYY').subtract(14, 'years').subtract(1, 'days').format('YYYY-MM-DD');
      const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
      if (!url) {
        resolve(false);
        return;
      }

      PostJsonData<ICompetitor[]>(
        url,
        {
          iType: 'TOP',
          iFromDate: fromDate,
          iBirthDate: birthDate
        },
        true,
        sessionModel.authorizationHeader
      )
        .then(competitors => {
          const mc = competitors?.filter(c => c.gender === 'MALE') ?? [];
          const fc = competitors?.filter(c => c.gender === 'FEMALE') ?? [];
          setMaleCompetitors(mc);
          setFemaleCompetitors(fc);
          viewNumberOfRef.current = 10;
          viewMaxNumberOfRef.current = Math.max(mc.length, fc.length);
          setViewNumberOf(viewNumberOfRef.current);
          setLoading(false);
          resolve(viewNumberOfRef.current < viewMaxNumberOfRef.current);
        })
        .catch(e => {
          if (e && (e as { message: string }).message) message.error((e as { message: string }).message);
          reject(e);
        });
    });
  }, [clubModel.modules, sessionModel.authorizationHeader]);

  const infoButton = <Button onClick={() => StarsInfoModal(t, modal, gender)}>Info</Button>;

  return (
    <InfiniteScroll key="InfiniteScroll#competitorPresentation" loadMore={loadMoreCallback}>
      <StyledTabs
        defaultActiveKey={gender}
        tabBarExtraContent={infoButton}
        onChange={value => setGender(value as GenderType)}
      >
        <TabPane key="MALE" tab={t('results.Male')}>
          {!loading ? (
            <div>
              {viewMaleCompetitors.map(c => (
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
        <TabPane key="FEMALE" tab={t('results.FeMale')}>
          {!loading ? (
            <div>
              {viewFemaleCompetitors.map(c => (
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
      {contextHolder}
    </InfiniteScroll>
  );
});

export default AllCompetitorsPresentation;
