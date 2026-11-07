import { PlusOutlined, TrophyOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, Radio, Select, Space, Tag, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { ICupProps, ICupRaceForEventProps } from '../../models/cupModel';
import { useMobxStore } from '../../utils/mobxStore';
import { useResultWizardStore } from '../../utils/resultWizardStore';
import { notifyCupsChanged, showCupError, useCupApi, useCups } from '../cup/useCup';

const StyledContainer = styled.div`
  margin-bottom: 16px;
`;

const StyledRaceRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-bottom: 4px;
`;

interface INewCupRaceForm {
  cupId?: number;
  seasonId?: number;
  name: string;
  useTotalResult: boolean;
}

/**
 * Links the race in the result import to one or more cup races. When the race is saved,
 * the club members results are saved to the linked cup races automatically.
 * A new cup race can be added to a season of a cup, and for each cup race it is chosen whether the result of the
 * stage or the total after the stage (an event of several days) counts.
 */
const ResultsWizardCupRaces = observer(() => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { query, save } = useCupApi();
  const { raceWizardModel } = useResultWizardStore();
  const [cupRaces, setCupRaces] = useState<ICupRaceForEventProps[]>();
  const [reloadKey, setReloadKey] = useState(0);
  const [savingRaceId, setSavingRaceId] = useState<number>();
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
  }, [eventId, eventorId, eventorRaceId, query, queryUrl, raceDate, raceWizardModel, reloadKey]);

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

  /** The stage or the total after the stage, saved on the cup race at once: the results are saved by it */
  const setUseTotalResult = useCallback(
    async (cupRaceId: number, useTotalResult: boolean) => {
      setSavingRaceId(cupRaceId);
      try {
        await save({ iType: 'RACE_USE_TOTAL_RESULT', iCupRaceId: cupRaceId, iUseTotalResult: useTotalResult });
        const list = (cupRaces ?? []).map(r => (r.cupRaceId === cupRaceId ? { ...r, useTotalResult } : r));
        setCupRaces(list);
        raceWizardModel.setCupRacesForEvent(list);
        notifyCupsChanged();
      } catch (e) {
        showCupError(e);
      } finally {
        setSavingRaceId(undefined);
      }
    },
    [cupRaces, raceWizardModel, save]
  );

  // A new cup race
  const [newRaceOpen, setNewRaceOpen] = useState(false);
  const [newRaceSaving, setNewRaceSaving] = useState(false);
  const [form] = Form.useForm<INewCupRaceForm>();
  const { cups } = useCups(true);
  const [cup, setCup] = useState<ICupProps>();
  const selectedCupId = Form.useWatch('cupId', form);
  const hasTotalResults = !!raceEvent?.results.some(r => r.resultMultiDay != null);

  useEffect(() => {
    if (!newRaceOpen || !selectedCupId) {
      setCup(undefined);
      return;
    }
    let cancelled = false;
    query<ICupProps>({ iType: 'CUP', iCupId: selectedCupId }, false).then(response => {
      if (cancelled || !response) return;
      setCup(response);
      // The season the race is in
      const season = (response.seasons ?? []).find(s => raceDate && s.startDate <= raceDate && raceDate <= s.endDate);
      form.setFieldsValue({ seasonId: season?.seasonId });
    });
    return () => {
      cancelled = true;
    };
  }, [form, newRaceOpen, query, raceDate, selectedCupId]);

  const openNewRace = () => {
    form.resetFields();
    form.setFieldsValue({ name: raceEvent?.name ?? '', useTotalResult: hasTotalResults });
    setNewRaceOpen(true);
  };

  const saveNewRace = async () => {
    try {
      const values = await form.validateFields();
      setNewRaceSaving(true);
      const saved = await save<{ cupRaceId: number }[]>({
        iType: 'RACES',
        iSeasonId: values.seasonId,
        iRaces: [
          {
            iCupRaceId: -1,
            iName: values.name,
            iRaceDate: raceDate,
            iEventorId: eventorId ?? null,
            iEventorRaceId: eventorRaceId ?? null,
            iUseTotalResult: values.useTotalResult,
            iTheme: null
          }
        ]
      });
      const cupRaceId = Array.isArray(saved) && saved.length ? saved[0].cupRaceId : undefined;
      if (cupRaceId) raceWizardModel.setCupRaceIds([...(raceWizardModel.cupRaceIds ?? []), cupRaceId]);
      notifyCupsChanged();
      setNewRaceOpen(false);
      setReloadKey(key => key + 1);
    } catch (e) {
      showCupError(e);
    } finally {
      setNewRaceSaving(false);
    }
  };

  if (!queryUrl || !cupRaces || !raceDate) return null;

  const selectedRaces = (raceWizardModel.cupRaceIds ?? [])
    .map(id => cupRaces.find(r => r.cupRaceId === id))
    .filter((r): r is ICupRaceForEventProps => !!r);

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
          <Space.Compact style={{ width: '100%' }}>
            <Select
              allowClear
              mode="multiple"
              value={raceWizardModel.cupRaceIds ?? []}
              options={options}
              placeholder={cupRaces.length === 0 ? t('cup.NoCupRacesForEvent') : undefined}
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
            <Button icon={<PlusOutlined />} onClick={openNewRace}>
              {t('cup.NewCupRaceForEvent')}
            </Button>
          </Space.Compact>
        </Form.Item>
      </Form>
      {selectedRaces.map(r => (
        <StyledRaceRow key={r.cupRaceId}>
          <Typography.Text>{`${r.cupName} ${r.seasonName}: ${r.name}`}</Typography.Text>
          <Radio.Group
            size="small"
            optionType="button"
            value={r.useTotalResult}
            disabled={savingRaceId === r.cupRaceId}
            options={[
              { value: false, label: t('cup.UseStageResult') },
              { value: true, label: t('cup.UseTotalResult') }
            ]}
            onChange={e => setUseTotalResult(r.cupRaceId, e.target.value)}
          />
          {r.useTotalResult && !hasTotalResults ? (
            <Typography.Text type="warning">{t('cup.UseTotalResultMissing')}</Typography.Text>
          ) : null}
        </StyledRaceRow>
      ))}
      {selectedRaces.some(r => r.participants === 'ALL') ? (
        <Alert showIcon type="info" title={t('cup.AllParticipantsFromEventorInfo')} style={{ marginBottom: 8 }} />
      ) : null}
      {selectedRaces.some(r => r.linkedToOtherEvent) ? (
        <Alert showIcon type="warning" title={t('cup.LinkedToOtherEventWarning')} />
      ) : null}
      <Modal
        open={newRaceOpen}
        title={t('cup.NewCupRaceForEvent')}
        okText={t('common.Save')}
        cancelText={t('common.Cancel')}
        confirmLoading={newRaceSaving}
        onOk={saveNewRace}
        onCancel={() => setNewRaceOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="cupId" label={t('cup.Cup')} rules={[{ required: true, message: t('cup.ChooseCup') }]}>
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              options={(cups ?? []).map(c => ({ value: c.cupId, label: c.name }))}
              onChange={() => form.setFieldsValue({ seasonId: undefined })}
            />
          </Form.Item>
          <Form.Item
            name="seasonId"
            label={t('cup.Season')}
            extra={t('cup.NewCupRaceSeasonInfo', { date: raceDate })}
            rules={[{ required: true, message: t('cup.ChooseSeason') }]}
          >
            <Select
              disabled={!cup}
              options={(cup?.seasons ?? []).map(s => ({
                value: s.seasonId,
                label: `${s.name} (${s.startDate} – ${s.endDate})`,
                // The race must be within the dates of the season
                disabled: raceDate < s.startDate || raceDate > s.endDate
              }))}
            />
          </Form.Item>
          <Form.Item name="name" label={t('cup.RaceName')} rules={[{ required: true, max: 128 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="useTotalResult" label={t('cup.ResultThatCounts')}>
            <Radio.Group
              options={[
                { value: false, label: t('cup.UseStageResult') },
                { value: true, label: t('cup.UseTotalResult') }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </StyledContainer>
  );
});

export default ResultsWizardCupRaces;
