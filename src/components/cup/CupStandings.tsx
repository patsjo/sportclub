import { DownOutlined } from '@ant-design/icons';
import { Empty, Table, TableColumnsType, Tabs, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { ICupRaceProps, ICupResultProps, ICupSeasonSettings } from '../../models/cupModel';
import { calculateCupStandings, formatCupBehind, getCupPursuitRace, ICupStandingRow } from '../../utils/cupHelper';
import { CupButton, CupHeading, CupMuted, CupPanel, CupRank, CupTableWrapper } from './CupStyled';
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
  background: ${({ $place }) => ($place === 1 ? 'var(--cup-highlight)' : 'var(--cup-row-alt)')};
  color: ${({ $place }) => ($place === 1 ? 'var(--cup-highlight-text)' : 'var(--cup-panel-text)')};
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
    font-size: 13px;
    font-weight: 600;
  }
  /* An outline, so that the gold medal is seen on the highlight color of the winner */
  .cup-podium-medal {
    display: inline-flex;
    filter: drop-shadow(2px 0 0 var(--cup-ink)) drop-shadow(-2px 0 0 var(--cup-ink)) drop-shadow(0 2px 0 var(--cup-ink))
      drop-shadow(0 -2px 0 var(--cup-ink));
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
  const pursuitRace = getCupPursuitRace(sortedRaces, settings);
  // The podium and the top 6 of every class, a class can be expanded to all
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // The race closest in time, on a small screen the table is scrolled so that it is the last visible race
  const closestRaceId = useMemo(() => {
    const today = dayjs().startOf('day');
    let closest: { cupRaceId: number; days: number } | undefined;
    sortedRaces.forEach(race => {
      const days = Math.abs(dayjs(race.raceDate).startOf('day').diff(today, 'day'));
      // On equal distance the earlier race, it has results
      if (!closest || days < closest.days) closest = { cupRaceId: race.cupRaceId, days };
    });
    return closest?.cupRaceId;
  }, [sortedRaces]);
  // Only when the table is mounted, the reader may scroll after that
  const scrollToClosestRace = useCallback(
    (wrapper: HTMLDivElement | null) => {
      if (!wrapper || closestRaceId == null) return;
      requestAnimationFrame(() => {
        const content = wrapper.querySelector<HTMLElement>('.ant-table-content');
        const cell = wrapper.querySelector<HTMLElement>('thead th.cup-closest-race');
        if (!content || !cell || content.scrollWidth <= content.clientWidth) return;
        // The fixed total column on the right covers the end of the scrolled columns
        const fixedEnd = Array.from(wrapper.querySelectorAll<HTMLElement>('thead th.ant-table-cell-fix-end')).reduce(
          (width, th) => width + th.offsetWidth,
          0
        );
        content.scrollLeft = Math.max(0, cell.offsetLeft + cell.offsetWidth - (content.clientWidth - fixedEnd));
      });
    },
    [closestRaceId]
  );

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
        <Tooltip
          title={`${race.name} ${race.raceDate}${race.cupRaceId === pursuitRace?.cupRaceId ? ` · ${t('cup.Pursuit')}` : ''}`}
        >
          <span>
            {race.cupRaceId === pursuitRace?.cupRaceId ? t('cup.PursuitShort') : String(index + 1).padStart(2, '0')}
          </span>
        </Tooltip>
      ),
      key: `race${race.cupRaceId}`,
      className: race.cupRaceId === closestRaceId ? 'cup-closest-race' : undefined,
      align: 'center' as const,
      width: race.cupRaceId === pursuitRace?.cupRaceId ? 76 : 56,
      render: (_: unknown, row: ICupStandingRow) => {
        // The pursuit is shown as the time behind the winner, it decides the placing
        if (race.cupRaceId === pursuitRace?.cupRaceId) {
          if (row.pursuit?.behindSeconds != null) {
            return <span className="cup-points">{formatCupBehind(row.pursuit.behindSeconds)}</span>;
          }
          return row.pursuit?.status && row.pursuit.status !== 'OK' ? (
            <CupMuted>{t(`cup.Status${row.pursuit.status}`)}</CupMuted>
          ) : (
            <CupMuted>–</CupMuted>
          );
        }
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
              <span className="cup-podium-medal">
                <CupRank rank={row.rank} size={i === 1 ? 44 : 36} />
              </span>
              <span className="cup-podium-name">{row.personName}</span>
              {row.clubName ? <span className="cup-podium-club">{row.clubName}</span> : null}
              <span className="cup-podium-points">
                {row.pursuit?.behindSeconds != null
                  ? formatCupBehind(row.pursuit.behindSeconds)
                  : `${format(row.totalPoints)} ${t('cup.PointsShort')}`}
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
        (() => {
          const content = (standing: (typeof standings)[number]) =>
            standing.groups.length === 0 ? (
              <Empty description={t('cup.NoResultsYet')} />
            ) : (
              standing.groups.map(group => (
                <div key={group.key} style={{ marginBottom: 40 }}>
                  {standing.groups.length > 1 || standing.category.groupByClass ? (
                    <CupHeading>{group.title}</CupHeading>
                  ) : null}
                  {podium(group.rows)}
                  {(() => {
                    const expandKey = `${standing.category.id}|${group.key}`;
                    const expanded = expandedGroups.includes(expandKey);
                    // Shared places on the sixth place are shown as well
                    const shown = expanded ? group.rows : group.rows.filter(r => r.rank <= 6);
                    return (
                      <>
                        <CupTableWrapper ref={scrollToClosestRace}>
                          <Table<ICupStandingRow>
                            size="small"
                            pagination={false}
                            rowKey="key"
                            columns={columns}
                            dataSource={shown}
                            scroll={{ x: 'max-content' }}
                          />
                        </CupTableWrapper>
                        {shown.length < group.rows.length ? (
                          <CupButton
                            $secondary
                            as="button"
                            type="button"
                            style={{ marginTop: 14 }}
                            onClick={() => setExpandedGroups(list => [...list, expandKey])}
                          >
                            <DownOutlined /> {t('cup.ShowWholeClass', { count: group.rows.length })}
                          </CupButton>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              ))
            );
          // One category only: no tabs, the name of the category says nothing new
          return standings.length === 1 ? (
            content(standings[0])
          ) : (
            <Tabs
              items={standings.map(standing => ({
                key: standing.category.id,
                label: standing.category.name,
                children: content(standing)
              }))}
            />
          );
        })()
      )}
      {pursuitRace ? (
        <CupMuted style={{ display: 'block', marginBottom: 6 }}>
          {t('cup.PursuitStandingsInfo', { seconds: settings.pursuit.secondsPerPoint })}
        </CupMuted>
      ) : null}
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
