import { TrophyOutlined } from '@ant-design/icons';
import { Alert, Form, Select, Tag } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { ICupRaceForEventProps } from '../../models/cupModel';
import { useMobxStore } from '../../utils/mobxStore';
import { useResultWizardStore } from '../../utils/resultWizardStore';
import { useCupApi } from '../cup/useCup';

const StyledContainer = styled.div`
  margin-bottom: 16px;
`;

/**
 * Links the race in the result import to one or more cup races. When the race is saved,
 * the club members results are saved to the linked cup races automatically.
 */
const ResultsWizardCupRaces = observer(() => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { query } = useCupApi();
  const { raceWizardModel } = useResultWizardStore();
  const [cupRaces, setCupRaces] = useState<ICupRaceForEventProps[]>();
  const queryUrl = clubModel.module('Cup')?.queryUrl;
  const raceEvent = raceWizardModel.raceEvent;
  const eventId = raceEvent?.eventId;
  const eventorId = raceEvent?.eventorId;
  const eventorRaceId = raceEvent?.eventorRaceId;
  const raceDate = raceEvent?.raceDate;

  useEffect(() => {
    if (!queryUrl || !raceDate) return;
    let cancelled = false;
    query<ICupRaceForEventProps[]>(
      {
        iType: 'RACES_FOR_EVENT',
        iEventId: eventId,
        iEventorId: eventorId,
        iEventorRaceId: eventorRaceId,
        iRaceDate: raceDate
      },
      false
    )
      .then(response => {
        if (cancelled) return;
        const list = Array.isArray(response) ? response : [];
        setCupRaces(list);
        raceWizardModel.setCupRacesForEvent(list);
        // Already linked races, or the suggestions for a race not linked before
        if (raceWizardModel.cupRaceIds === undefined) {
          const linked = list.filter(r => r.linked).map(r => r.cupRaceId);
          raceWizardModel.setCupRaceIds(
            linked.length ? linked : list.filter(r => r.suggested && !r.linkedToOtherEvent).map(r => r.cupRaceId)
          );
        }
      })
      .catch(() => !cancelled && setCupRaces([]));
    return () => {
      cancelled = true;
    };
  }, [eventId, eventorId, eventorRaceId, query, queryUrl, raceDate, raceWizardModel]);

  const options = useMemo(
    () =>
      (cupRaces ?? [])
        .slice()
        .sort(
          (a, b) =>
            Number(b.linked || b.suggested) - Number(a.linked || a.suggested) ||
            a.cupName.localeCompare(b.cupName, 'sv') ||
            a.raceDate.localeCompare(b.raceDate)
        )
        .map(r => ({
          value: r.cupRaceId,
          label: `${r.cupName} ${r.seasonName}: ${r.name} (${r.raceDate})`,
          suggested: r.suggested,
          linkedToOtherEvent: r.linkedToOtherEvent
        })),
    [cupRaces]
  );

  if (!queryUrl || !cupRaces || cupRaces.length === 0) return null;

  return (
    <StyledContainer>
      <Form layout="vertical">
        <Form.Item
          label={
            <span>
              <TrophyOutlined style={{ marginRight: 6 }} />
              {t('cup.LinkToCupRaces')}
            </span>
          }
          extra={t('cup.LinkToCupRacesInfo')}
        >
          <Select
            allowClear
            mode="multiple"
            value={raceWizardModel.cupRaceIds ?? []}
            options={options}
            optionRender={option => (
              <span>
                {option.data.label}
                {option.data.suggested ? (
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    {t('cup.Suggested')}
                  </Tag>
                ) : null}
                {option.data.linkedToOtherEvent ? (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    {t('cup.LinkedToOtherEvent')}
                  </Tag>
                ) : null}
              </span>
            )}
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            onChange={(values: number[]) => raceWizardModel.setCupRaceIds(values)}
          />
        </Form.Item>
      </Form>
      {(raceWizardModel.cupRaceIds ?? []).some(id => cupRaces.find(r => r.cupRaceId === id)?.participants === 'ALL') ? (
        <Alert showIcon type="info" title={t('cup.AllParticipantsFromEventorInfo')} style={{ marginBottom: 8 }} />
      ) : null}
      {(raceWizardModel.cupRaceIds ?? []).some(id => cupRaces.find(r => r.cupRaceId === id)?.linkedToOtherEvent) ? (
        <Alert showIcon type="warning" title={t('cup.LinkedToOtherEventWarning')} />
      ) : null}
    </StyledContainer>
  );
});

export default ResultsWizardCupRaces;
