import { DownloadOutlined } from '@ant-design/icons';
import { Button, Empty, Table, TableColumnsType, Tabs } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ICupRaceProps, ICupResultProps, ICupSeasonSettings } from '../../models/cupModel';
import {
  addCupClockTime,
  calculateCupStandings,
  cupClassKey,
  formatCupBehind,
  ICupCategoryStanding,
  ICupStandingRow
} from '../../utils/cupHelper';
import { CupHeading, CupMuted, CupTableWrapper } from './CupStyled';

interface ICupPursuitStartListProps {
  races: ICupRaceProps[];
  results: ICupResultProps[];
  settings: ICupSeasonSettings;
  seasonYear: number;
  /** Used as the file name of the export */
  name: string;
}

interface IStartRow extends ICupStandingRow {
  startPosition: number;
  start: string;
  massStart: boolean;
}

/**
 * The start list of the pursuit: the standings before the last race, the leader first and the others
 * after the leader with the points behind times the seconds per point.
 */
const CupPursuitStartList = ({ races, results, settings, seasonYear, name }: ICupPursuitStartListProps) => {
  const { t } = useTranslation();
  const standings = useMemo(
    () => calculateCupStandings(races, results, settings, seasonYear),
    [races, results, seasonYear, settings]
  );
  const decimals = settings.pointSystem.decimals;

  const startRows = (standing: ICupCategoryStanding) =>
    standing.groups.map(group => {
      const startTime = settings.pursuit.startTimes[cupClassKey(group.title)];
      const rows = [...group.rows]
        .filter(r => r.pursuit)
        .sort(
          (a, b) =>
            a.pursuit!.startOffsetSeconds - b.pursuit!.startOffsetSeconds ||
            a.personName.localeCompare(b.personName, 'sv')
        )
        .map((row, index): IStartRow => ({
          ...row,
          massStart: row.pursuit!.massStart,
          startPosition: index + 1,
          start:
            addCupClockTime(startTime, row.pursuit!.startOffsetSeconds) ??
            formatCupBehind(row.pursuit!.startOffsetSeconds)
        }));
      return { key: group.key, title: group.title, rows };
    });

  const exportCsv = () => {
    const quote = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [
      [t('cup.Categories'), t('cup.Class'), '#', t('cup.StartTime'), t('cup.Name'), t('cup.Club'), t('cup.Points')]
        .map(quote)
        .join(';')
    ];
    standings.forEach(standing =>
      startRows(standing).forEach(group =>
        group.rows.forEach(row =>
          lines.push(
            [
              standing.category.name,
              group.title,
              row.startPosition,
              row.massStart ? `${row.start} ${t('cup.MassStart')}` : row.start,
              row.personName,
              row.clubName,
              row.totalPoints.toLocaleString('sv-SE', { maximumFractionDigits: decimals })
            ]
              .map(quote)
              .join(';')
          )
        )
      )
    );
    // With BOM, so that Excel reads the Swedish characters
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${name}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const columns: TableColumnsType<IStartRow> = [
    { title: '#', dataIndex: 'startPosition', key: 'startPosition', width: 52 },
    {
      title: t('cup.StartTime'),
      dataIndex: 'start',
      key: 'start',
      width: 130,
      render: (start: string, row) => (
        <>
          <span className="cup-points">{start}</span>
          {row.massStart ? (
            <div>
              <CupMuted>{t('cup.MassStart')}</CupMuted>
            </div>
          ) : null}
        </>
      )
    },
    {
      title: t('cup.Name'),
      key: 'name',
      render: (_: unknown, row) => (
        <div>
          <span className={row.isClubMember ? 'cup-club-member' : undefined}>{row.personName}</span>
          {row.clubName ? (
            <div>
              <CupMuted>{row.clubName}</CupMuted>
            </div>
          ) : null}
        </div>
      )
    },
    {
      title: t('cup.Points'),
      dataIndex: 'totalPoints',
      key: 'points',
      align: 'right',
      width: 80,
      render: (points: number) => (
        <span className="cup-total">{points.toLocaleString('sv-SE', { maximumFractionDigits: decimals })}</span>
      )
    }
  ];

  const content = (standing: ICupCategoryStanding) => {
    const groups = startRows(standing).filter(g => g.rows.length > 0);
    return groups.length === 0 ? (
      <Empty description={t('cup.NoResultsYet')} />
    ) : (
      groups.map(group => (
        <div key={group.key} style={{ marginBottom: 32 }}>
          <CupHeading>{group.title}</CupHeading>
          <CupTableWrapper>
            <Table<IStartRow> size="small" pagination={false} rowKey="key" columns={columns} dataSource={group.rows} />
          </CupTableWrapper>
        </div>
      ))
    );
  };

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <CupMuted style={{ flex: 1 }}>
          {t('cup.PursuitStartListInfo', { seconds: settings.pursuit.secondsPerPoint })}
        </CupMuted>
        <Button icon={<DownloadOutlined />} onClick={exportCsv}>
          {t('cup.ExportStartList')}
        </Button>
      </div>
      {standings.length === 1 ? (
        content(standings[0])
      ) : (
        <Tabs
          items={standings.map(standing => ({
            key: standing.category.id,
            label: standing.category.name,
            children: content(standing)
          }))}
        />
      )}
    </>
  );
};

export default CupPursuitStartList;
