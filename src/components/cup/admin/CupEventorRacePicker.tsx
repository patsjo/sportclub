import { Button, Checkbox, DatePicker, Input, Modal, Radio, Space, Table, TableColumnsType, Tag } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ICupSeasonProps } from '../../../models/cupModel';
import { PostJsonData } from '../../../utils/api';
import { dateFormat } from '../../../utils/formHelper';
import { useMobxStore } from '../../../utils/mobxStore';
import { useTableRowsThatFit } from '../../../utils/useTableRowsThatFit';
import { IEventorEvent, IEventorEventRace, IEventorEvents } from '../../../utils/responseEventorInterfaces';
import { showCupError, useCupApi } from '../useCup';
import { useCupEventorImport } from '../useCupEventorImport';

interface IEventorRaceRow {
  key: string;
  eventorId: number;
  eventorRaceId: number;
  name: string;
  raceDate: string;
  isMultiDay: boolean;
  alreadyAdded: boolean;
}

type OrganisationFilter = 'CLUB' | 'NEARBY' | 'DISTRICT' | 'ALL';

interface ICupEventorRacePickerProps {
  season: ICupSeasonProps;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Choose races in Eventor to add to a season */
const CupEventorRacePicker = ({ season, open, onClose, onSaved }: ICupEventorRacePickerProps) => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { save } = useCupApi();
  const importFromEventor = useCupEventorImport();
  // As many rows as fit in the dialog, pages but no scroll
  const { pageSize, tableRef } = useTableRowsThatFit();
  const [dates, setDates] = useState<[string, string]>(() => {
    const today = dayjs().format(dateFormat);
    return [today > season.startDate && today < season.endDate ? today : season.startDate, season.endDate];
  });
  const [organisations, setOrganisations] = useState<OrganisationFilter>('NEARBY');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<IEventorRaceRow[]>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [totalResult, setTotalResult] = useState<string[]>([]);

  const organisationIds = useMemo(() => {
    const eventor = clubModel.eventor;
    if (!eventor) return [];
    switch (organisations) {
      case 'CLUB':
        return [String(eventor.organisationId)];
      case 'NEARBY':
        return eventor.defaultOrganisationIdsNearbyAndClub.length
          ? eventor.defaultOrganisationIdsNearbyAndClub
          : [String(eventor.organisationId)];
      case 'DISTRICT':
        return [String(eventor.districtOrganisationId)];
      default:
        return [];
    }
  }, [clubModel.eventor, organisations]);

  const fetchEvents = useCallback(async () => {
    if (!clubModel.eventor || !clubModel.eventorCorsProxy) return;
    setLoading(true);
    try {
      const response = await PostJsonData<IEventorEvents>(
        clubModel.eventorCorsProxy,
        {
          csurl: encodeURIComponent(
            `${clubModel.eventor.eventsUrl}?fromDate=${dates[0]}&toDate=${dates[1]}` +
              (organisationIds.length ? `&organisationIds=${organisationIds.join(',')}` : '') +
              '&includeAttributes=true'
          )
        },
        true
      );
      const events: IEventorEvent[] = !response?.Event
        ? []
        : Array.isArray(response.Event)
          ? response.Event
          : [response.Event];
      const list: IEventorRaceRow[] = [];
      events
        // EventStatusId 10 = Cancelled
        .filter(event => event.EventStatusId !== '10')
        .forEach(event => {
          const eventRaces: IEventorEventRace[] = Array.isArray(event.EventRace) ? event.EventRace : [event.EventRace];
          eventRaces
            .filter(race => race?.EventRaceId)
            .forEach(race => {
              const raceName = typeof race.Name === 'string' && race.Name.trim() ? race.Name : '';
              const eventorId = parseInt(event.EventId, 10);
              const eventorRaceId = parseInt(race.EventRaceId, 10);
              list.push({
                key: `${event.EventId}-${race.EventRaceId}`,
                eventorId,
                eventorRaceId,
                name: eventRaces.length > 1 && raceName ? `${event.Name}, ${raceName}` : event.Name,
                raceDate: race.RaceDate?.Date,
                isMultiDay: eventRaces.length > 1,
                alreadyAdded: season.races.some(r => r.eventorId === eventorId && r.eventorRaceId === eventorRaceId)
              });
            });
        });
      setRows(
        list
          .filter(r => r.raceDate >= season.startDate && r.raceDate <= season.endDate)
          .sort((a, b) => a.raceDate.localeCompare(b.raceDate))
      );
    } catch (e) {
      showCupError(e);
      setRows([]);
    }
    setLoading(false);
  }, [
    clubModel.eventor,
    clubModel.eventorCorsProxy,
    dates,
    organisationIds,
    season.endDate,
    season.races,
    season.startDate
  ]);

  const filtered = useMemo(
    () => (rows ?? []).filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const onOk = async () => {
    const races = (rows ?? []).filter(r => selected.includes(r.key));
    if (!races.length) return;
    try {
      setSaving(true);
      const saved = await save<{ cupRaceId: number }[]>({
        iType: 'RACES',
        iSeasonId: season.seasonId,
        iRaces: races.map(r => ({
          iCupRaceId: -1,
          iName: r.name.substring(0, 128),
          iRaceDate: r.raceDate,
          iEventorId: r.eventorId,
          iEventorRaceId: r.eventorRaceId,
          iUseTotalResult: totalResult.includes(r.key),
          iTheme: null
        }))
      });
      // All participants: the participants from other clubs only come from Eventor, also for imported races
      if (season.settings.participants === 'ALL' && Array.isArray(saved)) {
        await importFromEventor(
          races.map((r, i) => ({
            cupRaceId: saved[i].cupRaceId,
            eventorId: r.eventorId,
            eventorRaceId: r.eventorRaceId,
            useTotalResult: totalResult.includes(r.key),
            raceDate: r.raceDate,
            categories: season.settings.categories,
            seasonYear: parseInt(season.startDate.substring(0, 4), 10)
          }))
        );
      }
      setSaving(false);
      onSaved();
    } catch (e) {
      setSaving(false);
      showCupError(e);
    }
  };

  const columns: TableColumnsType<IEventorRaceRow> = [
    { title: t('cup.RaceDate'), dataIndex: 'raceDate', key: 'raceDate', width: 110 },
    {
      title: t('cup.RaceName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row) => (
        <>
          {name}
          {row.alreadyAdded ? (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {t('cup.AlreadyAdded')}
            </Tag>
          ) : null}
        </>
      )
    },
    {
      title: t('cup.UseTotalResult'),
      key: 'total',
      width: 140,
      render: (_, row) =>
        row.isMultiDay ? (
          <Checkbox
            checked={totalResult.includes(row.key)}
            disabled={!selected.includes(row.key)}
            onChange={e =>
              setTotalResult(list => (e.target.checked ? [...list, row.key] : list.filter(k => k !== row.key)))
            }
          />
        ) : null
    }
  ];

  return (
    <Modal
      title={t('cup.AddEventorRaces')}
      open={open}
      width={900}
      okText={t('cup.AddSelected', { count: selected.length })}
      cancelText={t('common.Cancel')}
      okButtonProps={{ loading: saving, disabled: selected.length === 0 }}
      maskClosable={false}
      style={{ top: 12, paddingBottom: 0 }}
      onOk={onOk}
      onCancel={onClose}
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <DatePicker.RangePicker
          format={dateFormat}
          allowClear={false}
          value={[dayjs(dates[0]), dayjs(dates[1])]}
          disabledDate={d => d.format(dateFormat) < season.startDate || d.format(dateFormat) > season.endDate}
          onChange={values =>
            values?.[0] && values?.[1] && setDates([values[0].format(dateFormat), values[1].format(dateFormat)])
          }
        />
        <Radio.Group
          value={organisations}
          optionType="button"
          options={[
            { value: 'CLUB', label: t('cup.OrganiserClub') },
            { value: 'NEARBY', label: t('cup.OrganiserNearby') },
            { value: 'DISTRICT', label: t('cup.OrganiserDistrict') },
            { value: 'ALL', label: t('common.All') }
          ]}
          onChange={e => setOrganisations(e.target.value)}
        />
        <Button type="primary" loading={loading} onClick={fetchEvents}>
          {t('cup.SearchEventor')}
        </Button>
      </Space>
      <div ref={tableRef}>
        {rows ? (
          <>
            <Input.Search
              allowClear
              placeholder={t('cup.FilterOnName')}
              value={search}
              style={{ marginBottom: 12 }}
              onChange={e => setSearch(e.target.value)}
            />
            <Table<IEventorRaceRow>
              size="small"
              rowKey="key"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize, hideOnSinglePage: true, showSizeChanger: false }}
              rowSelection={{
                selectedRowKeys: selected,
                onChange: keys => setSelected(keys as string[]),
                getCheckboxProps: row => ({ disabled: row.alreadyAdded })
              }}
            />
          </>
        ) : null}
      </div>
    </Modal>
  );
};

export default CupEventorRacePicker;
