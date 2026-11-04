import { Empty, Table, TableColumnsType, Tabs, Tooltip } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { ICupRaceProps, ICupResultProps, ICupSeasonSettings } from '../../models/cupModel';
import { calculateCupStandings, ICupStandingRow } from '../../utils/cupHelper';
import { CupHeading, CupMuted, CupPanel, CupRank, CupTableWrapper } from './CupStyled';
import { cupHeadingFont, cupLabelFont } from './cupThemes';

const Podium = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  align-items: end;
  gap: 12px;
  margin: 8px 0 22px 0;
  max-width: 760px;

  @media screen and (max-width: 560px) {
    gap: 6px;
  }
`;
const PodiumStep = styled.div<{ $place: number }>`
  position: relative;
  text-align: center;
  padding: 14px 8px 12px 8px;
  min-height: ${({ $place }) => ($place === 1 ? 170 : $place === 2 ? 142 : 124)}px;
  background: ${({ $place }) => ($place === 1 ? 'var(--cup-accent)' : 'var(--cup-row-alt)')};
  color: ${({ $place }) => ($place === 1 ? 'var(--cup-accent-text)' : 'var(--cup-panel-text)')};
  border: 3px solid var(--cup-ink);
  box-shadow: 5px 5px 0 var(--cup-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  overflow: hidden;

  .cup-podium-place {
    position: absolute;
    top: -12px;
    right: 6px;
    font-family: ${cupHeadingFont};
    font-size: 88px;
    line-height: 1;
    color: transparent;
    -webkit-text-stroke: 2px currentColor;
    opacity: 0.22;
  }
  .cup-podium-name {
    font-family: ${cupHeadingFont};
    font-size: clamp(15px, 2.2vw, 21px);
    line-height: 1.05;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }
  .cup-podium-points {
    font-family: ${cupLabelFont};
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.08em;
  }
  .cup-podium-club {
    font-size: 12px;
    opacity: 0.75;
  }
`;

interface ICupStandingsProps {
  races: ICupRaceProps[];
  results: ICupResultProps[];
  settings: ICupSeasonSettings;
  /** The year the ages are counted from */
  seasonYear?: number;
}

const CupStandings = ({ races, results, settings, seasonYear }: ICupStandingsProps) => {
  const { t } = useTranslation();
  const sortedRaces = useMemo(() => [...races].sort((a, b) => a.raceDate.localeCompare(b.raceDate)), [races]);
  const standings = useMemo(
    () => calculateCupStandings(sortedRaces, results, settings, seasonYear),
    [results, seasonYear, settings, sortedRaces]
  );
  const showBonus = settings.maxRacesCounted != null && settings.bonusPointsPerExtraRace > 0;
  const decimals = settings.pointSystem.decimals;
  const format = (points: number) => points.toLocaleString('sv-SE', { maximumFractionDigits: decimals });
  const showClasses = settings.categories.some(c => !c.groupByClass);

  const columns: TableColumnsType<ICupStandingRow> = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      width: 56,
      fixed: 'left',
      render: (rank: number) => <CupRank rank={rank} size={30} />
    },
    {
      title: t('cup.Name'),
      dataIndex: 'personName',
      key: 'personName',
      fixed: 'left',
      render: (_: string, row) => (
        <div>
          <span className={row.isClubMember ? 'cup-club-member' : undefined}>{row.personName}</span>
          <div>
            <CupMuted>
              {[row.clubName, row.classNames.length > 1 || showClasses ? row.classNames.join(', ') : null]
                .filter(Boolean)
                .join(' · ')}
            </CupMuted>
          </div>
        </div>
      )
    },
    ...sortedRaces.map((race, index) => ({
      title: (
        <Tooltip title={`${race.name} ${race.raceDate}`}>
          <span>{String(index + 1).padStart(2, '0')}</span>
        </Tooltip>
      ),
      key: `race${race.cupRaceId}`,
      align: 'center' as const,
      width: 56,
      render: (_: unknown, row: ICupStandingRow) => {
        const raceResult = row.races[race.cupRaceId];
        if (!raceResult) return <CupMuted>–</CupMuted>;
        return (
          <Tooltip
            title={
              raceResult.status !== 'OK'
                ? t(`cup.Status${raceResult.status}`)
                : raceResult.position
                  ? `${raceResult.position}:a`
                  : undefined
            }
          >
            <span className={`cup-points${raceResult.counted ? '' : ' cup-not-counted'}`}>
              {format(raceResult.points)}
            </span>
          </Tooltip>
        );
      }
    })),
    ...(showBonus
      ? [
          {
            title: t('cup.Bonus'),
            dataIndex: 'bonusPoints',
            key: 'bonus',
            align: 'center' as const,
            width: 64,
            render: (points: number) => (points ? <span className="cup-points">+{format(points)}</span> : null)
          }
        ]
      : []),
    {
      title: t('cup.Total'),
      dataIndex: 'totalPoints',
      key: 'total',
      align: 'right',
      fixed: 'right',
      width: 80,
      render: (points: number) => <span className="cup-total">{format(points)}</span>
    }
  ];

  const anyResults = standings.some(s => s.groups.length > 0);

  const podium = (rows: ICupStandingRow[]) => {
    const top = rows.slice(0, 3);
    if (top.length < 2) return null;
    // Second, first and third, as on a real podium
    const order: (ICupStandingRow | undefined)[] = [top[1], top[0], top[2]];
    return (
      <Podium>
        {order.map((row, i) =>
          row ? (
            <PodiumStep key={row.key} $place={i === 1 ? 1 : i === 0 ? 2 : 3}>
              <span className="cup-podium-place">{row.rank}</span>
              <CupRank rank={row.rank} size={i === 1 ? 44 : 36} />
              <span className="cup-podium-name">{row.personName}</span>
              {row.clubName ? <span className="cup-podium-club">{row.clubName}</span> : null}
              <span className="cup-podium-points">
                {format(row.totalPoints)} {t('cup.PointsShort')}
              </span>
            </PodiumStep>
          ) : (
            <div key={`empty${i}`} />
          )
        )}
      </Podium>
    );
  };

  return (
    <CupPanel>
      {!anyResults ? (
        <Empty description={t('cup.NoResultsYet')} />
      ) : (
        <Tabs
          items={standings.map(standing => ({
            key: standing.category.id,
            label: standing.category.name,
            children:
              standing.groups.length === 0 ? (
                <Empty description={t('cup.NoResultsYet')} />
              ) : (
                standing.groups.map(group => (
                  <div key={group.key} style={{ marginBottom: 40 }}>
                    {standing.groups.length > 1 || standing.category.groupByClass ? (
                      <CupHeading>{group.title}</CupHeading>
                    ) : null}
                    {podium(group.rows)}
                    <CupTableWrapper>
                      <Table<ICupStandingRow>
                        size="small"
                        pagination={false}
                        rowKey="key"
                        columns={columns}
                        dataSource={group.rows}
                        scroll={{ x: 'max-content' }}
                      />
                    </CupTableWrapper>
                  </div>
                ))
              )
          }))}
        />
      )}
      {settings.maxRacesCounted != null ? (
        <CupMuted>
          {t('cup.CountedInfo', { count: settings.maxRacesCounted })}
          {showBonus ? ` ${t('cup.BonusInfo', { points: settings.bonusPointsPerExtraRace })}` : ''}
        </CupMuted>
      ) : null}
    </CupPanel>
  );
};

export default CupStandings;
