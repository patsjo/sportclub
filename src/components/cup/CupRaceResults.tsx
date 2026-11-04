import { Empty, Table, TableColumnsType } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ICupResultProps, ICupSeasonSettings } from '../../models/cupModel';
import { formatCupTime, getCupRaceResultsByClass, ICupScoredResult } from '../../utils/cupHelper';
import { CupHeading, CupMuted, CupRank, CupTableWrapper } from './CupStyled';

interface ICupRaceResultsProps {
  cupRaceId: number;
  results: ICupResultProps[];
  settings: ICupSeasonSettings;
}

/** The results of one race, per class, with the cup points */
const CupRaceResults = ({ cupRaceId, results, settings }: ICupRaceResultsProps) => {
  const { t } = useTranslation();
  const classes = useMemo(() => getCupRaceResultsByClass(cupRaceId, results, settings), [cupRaceId, results, settings]);
  const format = (points: number | null) =>
    points == null ? '' : points.toLocaleString('sv-SE', { maximumFractionDigits: settings.pointSystem.decimals });

  const columns: TableColumnsType<ICupScoredResult> = [
    {
      title: '#',
      key: 'position',
      width: 52,
      render: (_, r) => (r.status === 'OK' && r.scoredPosition ? <CupRank rank={r.scoredPosition} /> : null)
    },
    {
      title: t('cup.Name'),
      key: 'name',
      render: (_, r) => (
        <div>
          <span className={r.isClubMember ? 'cup-club-member' : undefined}>{r.personName}</span>
          {r.clubName ? (
            <div>
              <CupMuted>{r.clubName}</CupMuted>
            </div>
          ) : null}
        </div>
      )
    },
    {
      title: t('cup.Time'),
      key: 'time',
      align: 'right',
      render: (_, r) =>
        r.status !== 'OK' ? (
          t(`cup.Status${r.status}`)
        ) : (
          <span>
            {formatCupTime(r.timeSeconds)}
            {r.scoredTimeBehindSeconds ? <CupMuted> +{formatCupTime(r.scoredTimeBehindSeconds)}</CupMuted> : null}
          </span>
        )
    },
    {
      title: t('cup.Points'),
      key: 'points',
      align: 'right',
      width: 72,
      render: (_, r) => <strong>{format(r.points)}</strong>
    }
  ];

  if (classes.length === 0) return <Empty description={t('cup.NoResultsYet')} />;

  return (
    <>
      {classes.map(cls => (
        <div key={cls.className} style={{ marginBottom: 24 }}>
          <CupHeading>{cls.className}</CupHeading>
          <CupTableWrapper>
            <Table<ICupScoredResult>
              size="small"
              pagination={false}
              rowKey="cupResultId"
              columns={columns}
              dataSource={cls.results}
            />
          </CupTableWrapper>
        </div>
      ))}
    </>
  );
};

export default CupRaceResults;
