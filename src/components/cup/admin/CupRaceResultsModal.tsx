import { CloudDownloadOutlined, DatabaseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Input, InputNumber, Modal, Select, Space, Table, TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cupResultStatuses, ICupRaceProps, ICupResultProps, ICupSeasonProps } from '../../../models/cupModel';
import {
  compareCupClasses,
  cupAgeMatchesCategory,
  cupClassKey,
  filterToCupClasses,
  mergeCupEventorResults,
  formatCupTime,
  parseCupTime
} from '../../../utils/cupHelper';
import { useMobxStore } from '../../../utils/mobxStore';
import { useTableRowsThatFit } from '../../../utils/useTableRowsThatFit';
import { showCupError, useCupApi } from '../useCup';
import { fetchEventorCupResults } from '../useCupEventorImport';

interface ICupRaceResultsModalProps {
  season: ICupSeasonProps;
  race: ICupRaceProps;
  /** The results shown now, may include results from the club database that are not saved to the cup */
  results: ICupResultProps[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

let newId = -1000000;

/**
 * Results of a cup race: fetch from the clubs own results (first hand) or from Eventor,
 * and add or change results manually.
 */
const CupRaceResultsModal = ({ season, race, results, open, onClose, onSaved }: ICupRaceResultsModalProps) => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { query, save } = useCupApi();
  // Sorted on class and position only when the results are loaded or fetched, never while editing,
  // otherwise a row jumps away (and loses the focus) while its class or position is typed in
  const sortRows = (list: ICupResultProps[]) => {
    const compareClasses = compareCupClasses(season.settings.classOrder);
    return [...list].sort(
      (a, b) => compareClasses(a.className, b.className) || (a.position ?? 99999) - (b.position ?? 99999)
    );
  };
  const [rows, setRows] = useState<ICupResultProps[]>(() =>
    sortRows(results.filter(r => r.cupRaceId === race.cupRaceId))
  );
  const [fetching, setFetching] = useState<'DB' | 'EVENTOR'>();
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const onlyClub = season.settings.participants === 'CLUB';
  // The ages of the categories are counted from the year the season starts
  const seasonYear = parseInt(season.startDate.substring(0, 4), 10);

  const replaceSource = (source: 'DB' | 'EVENTOR', fetched: ICupResultProps[]) =>
    setRows(current =>
      sortRows(
        source === 'DB'
          ? // From the club database only club members come, the others and the manual results are kept
            [...current.filter(r => r.source === 'MANUAL' || !r.isClubMember), ...fetched]
          : // From Eventor: the results of the club and their adjustments are kept, see mergeCupEventorResults
            mergeCupEventorResults(
              current.filter(r => r.source !== 'EVENTOR'),
              fetched
            )
      )
    );

  const fetchFromDb = async () => {
    try {
      setFetching('DB');
      const fetched = await query<ICupResultProps[]>({
        iType: 'DB_RESULTS',
        iCupRaceId: race.cupRaceId,
        iEventId: race.eventId,
        iEventorId: race.eventorId,
        iEventorRaceId: race.eventorRaceId,
        iUseTotalResult: race.useTotalResult
      });
      // All participants: the club results still have short class names (H21K), they get the Eventor
      // names when fetched from Eventor, so they are only filtered on class when the cup is for the club
      replaceSource(
        'DB',
        season.settings.participants === 'ALL'
          ? // Only the age, the class names are not the Eventor names yet
            (fetched ?? []).filter(
              r =>
                !r.birthYear ||
                season.settings.categories.length === 0 ||
                season.settings.categories.some(c => cupAgeMatchesCategory(r.birthYear, seasonYear, c))
            )
          : filterToCupClasses(fetched ?? [], season.settings.categories, seasonYear)
      );
    } catch (e) {
      showCupError(e);
    }
    setFetching(undefined);
  };

  const fetchFromEventor = async () => {
    if (!clubModel.eventor || !clubModel.eventorCorsProxy || !race.eventorId) return;
    try {
      setFetching('EVENTOR');
      const fetched = filterToCupClasses(
        await fetchEventorCupResults(clubModel, race),
        season.settings.categories,
        seasonYear
      );
      replaceSource('EVENTOR', onlyClub ? fetched.filter(r => r.isClubMember) : fetched);
    } catch (e) {
      showCupError(e);
    }
    setFetching(undefined);
  };

  const update = (cupResultId: number, values: Partial<ICupResultProps>) =>
    setRows(list => list.map(r => (r.cupResultId === cupResultId ? { ...r, ...values } : r)));

  // The number of starters is the same for the whole class, set it on every result in the class
  const updateNofStarts = (className: string, nofStartsInClass: number | null) =>
    setRows(list =>
      list.map(r => (cupClassKey(r.className) === cupClassKey(className) ? { ...r, nofStartsInClass } : r))
    );

  const addRow = () =>
    setRows(list => {
      const className = list[list.length - 1]?.className ?? '';
      // The number of starters already set for the class
      const nofStartsInClass =
        list.find(r => cupClassKey(r.className) === cupClassKey(className) && r.nofStartsInClass)?.nofStartsInClass ??
        null;
      return [
        {
          cupResultId: newId--,
          cupRaceId: race.cupRaceId,
          competitorId: null,
          eventorPersonId: null,
          personName: '',
          birthYear: null,
          clubName: clubModel.title,
          isClubMember: true,
          className,
          status: 'OK',
          position: null,
          timeSeconds: null,
          timeBehindSeconds: null,
          nofStartsInClass,
          source: 'MANUAL'
        },
        ...list
      ];
    });

  const onOk = async () => {
    try {
      setSaving(true);
      await save({
        iType: 'RACE_RESULTS',
        iCupRaceId: race.cupRaceId,
        iResults: rows
      });
      setSaving(false);
      onSaved();
    } catch (e) {
      setSaving(false);
      showCupError(e);
    }
  };

  const shown = useMemo(
    () =>
      rows.filter(
        r =>
          !filter ||
          r.personName.toLowerCase().includes(filter.toLowerCase()) ||
          r.className.toLowerCase().includes(filter.toLowerCase())
      ),
    [filter, rows]
  );
  const invalid = rows.some(r => !r.personName.trim() || !r.className.trim());
  // Nothing saved for the race yet, the results shown come directly from the club database
  const unsavedDbRows = race.nofResults === 0 && rows.some(r => r.source === 'DB');
  // As many rows as fit in the dialog, pages but no scroll
  const { pageSize, tableRef } = useTableRowsThatFit({ fallbackRowHeight: 41 });

  const columns: TableColumnsType<ICupResultProps> = [
    {
      title: t('cup.Class'),
      key: 'className',
      width: 110,
      render: (_, r) => (
        <Input
          size="small"
          value={r.className}
          status={r.className.trim() ? undefined : 'error'}
          onChange={e => update(r.cupResultId, { className: e.target.value })}
        />
      )
    },
    {
      title: t('cup.Name'),
      key: 'personName',
      width: 190,
      render: (_, r) => (
        <Input
          size="small"
          value={r.personName}
          status={r.personName.trim() ? undefined : 'error'}
          onChange={e => update(r.cupResultId, { personName: e.target.value })}
        />
      )
    },
    {
      title: t('cup.BirthYear'),
      key: 'birthYear',
      width: 84,
      render: (_, r) => (
        <InputNumber
          size="small"
          min={1900}
          max={2100}
          controls={false}
          value={r.birthYear}
          style={{ width: 70 }}
          onChange={v => update(r.cupResultId, { birthYear: v ?? null })}
        />
      )
    },
    {
      title: t('cup.Club'),
      key: 'clubName',
      width: 150,
      render: (_, r) => (
        <Input
          size="small"
          value={r.clubName ?? ''}
          onChange={e => update(r.cupResultId, { clubName: e.target.value })}
        />
      )
    },
    {
      title: t('cup.ClubMember'),
      key: 'isClubMember',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Checkbox checked={r.isClubMember} onChange={e => update(r.cupResultId, { isClubMember: e.target.checked })} />
      )
    },
    {
      title: t('cup.Status'),
      key: 'status',
      width: 110,
      render: (_, r) => (
        <Select
          size="small"
          value={r.status}
          style={{ width: '100%' }}
          options={cupResultStatuses.map(s => ({ value: s, label: t(`cup.Status${s}`) }))}
          onChange={status =>
            update(
              r.cupResultId,
              status === 'OK' ? { status } : { status, position: null, timeSeconds: null, timeBehindSeconds: null }
            )
          }
        />
      )
    },
    {
      title: t('cup.Position'),
      key: 'position',
      width: 70,
      render: (_, r) => (
        <InputNumber
          size="small"
          min={1}
          disabled={r.status !== 'OK'}
          value={r.position}
          onChange={v => update(r.cupResultId, { position: v ?? null })}
        />
      )
    },
    {
      title: t('cup.NofStarts'),
      key: 'nofStartsInClass',
      width: 80,
      render: (_, r) => (
        <InputNumber
          size="small"
          min={1}
          controls={false}
          value={r.nofStartsInClass}
          title={t('cup.NofStartsInfo')}
          style={{ width: 64 }}
          onChange={v => updateNofStarts(r.className, v ?? null)}
        />
      )
    },
    {
      title: t('cup.Time'),
      key: 'time',
      width: 90,
      render: (_, r) => (
        <Input
          size="small"
          placeholder="mm:ss"
          disabled={r.status !== 'OK'}
          defaultValue={formatCupTime(r.timeSeconds)}
          onBlur={e => update(r.cupResultId, { timeSeconds: parseCupTime(e.target.value), timeBehindSeconds: null })}
        />
      )
    },
    {
      title: t('cup.TimeBehind'),
      key: 'timeBehind',
      width: 90,
      render: (_, r) => (
        <Input
          // Remounted when the time is changed, which clears the time behind
          key={`${r.cupResultId}-${r.timeBehindSeconds}`}
          size="small"
          placeholder="mm:ss"
          disabled={r.status !== 'OK'}
          defaultValue={formatCupTime(r.timeBehindSeconds)}
          onBlur={e => update(r.cupResultId, { timeBehindSeconds: parseCupTime(e.target.value) })}
        />
      )
    },
    {
      title: t('cup.Source'),
      key: 'source',
      width: 110,
      render: (_, r) => (
        <Select
          size="small"
          value={r.source}
          style={{ width: '100%' }}
          options={(['DB', 'EVENTOR', 'MANUAL'] as const).map(source => ({
            value: source,
            label: t(`cup.Source${source}`)
          }))}
          onChange={source => update(r.cupResultId, { source })}
        />
      )
    },
    {
      key: 'delete',
      width: 40,
      render: (_, r) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => setRows(list => list.filter(x => x.cupResultId !== r.cupResultId))}
        />
      )
    }
  ];

  return (
    <Modal
      title={`${t('cup.Results')}: ${race.name}`}
      open={open}
      // All columns fit on a big screen, a horizontal scroll only on smaller screens
      width="min(1480px, calc(100vw - 32px))"
      okText={t('common.Save')}
      cancelText={t('common.Cancel')}
      okButtonProps={{ loading: saving, disabled: invalid }}
      maskClosable={false}
      style={{ top: 12, paddingBottom: 0 }}
      onOk={onOk}
      onCancel={onClose}
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <Button
          icon={<DatabaseOutlined />}
          loading={fetching === 'DB'}
          disabled={!race.eventId && !race.eventorId}
          onClick={fetchFromDb}
        >
          {t('cup.FetchFromDb')}
        </Button>
        <Button
          icon={<CloudDownloadOutlined />}
          loading={fetching === 'EVENTOR'}
          disabled={!race.eventorId}
          onClick={fetchFromEventor}
        >
          {t('cup.FetchFromEventor')}
        </Button>
        <Button icon={<PlusOutlined />} onClick={addRow}>
          {t('cup.AddResult')}
        </Button>
        <Input.Search
          allowClear
          placeholder={t('cup.FilterOnName')}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </Space>
      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 12 }}
        title={race.eventId ? t('cup.LinkedToClubRace') : t('cup.ResultsSourcesInfo')}
      />
      {unsavedDbRows ? (
        <Alert showIcon type="warning" style={{ marginBottom: 12 }} title={t('cup.DbResultsNotSaved')} />
      ) : null}
      <div ref={tableRef}>
        <Table<ICupResultProps>
          size="small"
          rowKey="cupResultId"
          columns={columns}
          dataSource={shown}
          pagination={{ pageSize, hideOnSinglePage: true, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
        />
      </div>
    </Modal>
  );
};

export default CupRaceResultsModal;
