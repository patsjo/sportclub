import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  PlusOutlined,
  SettingOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { Alert, Button, Popconfirm, Spin } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { lazy, ReactNode, Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { styled } from 'styled-components';
import { ICupRaceProps, ICupReportProps, ICupResultProps, ICupSeasonProps } from '../../models/cupModel';
import { createCupPersonResolver, getCupPursuitRace, getCurrentCupSeason, getNextCupRace } from '../../utils/cupHelper';
import { dateFormat } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { SpinnerDiv } from '../styled/styled';
import CupRaceResults from './CupRaceResults';
import CupReports from './CupReports';
import { formatCupDate } from './cupDate';
import CupPursuitStartList from './CupPursuitStartList';
import CupStandings from './CupStandings';
import SocialSection from '../social/SocialSection';
import {
  CupAdminBar,
  CupBigNumber,
  CupBubble,
  CupBurst,
  CupButton,
  CupCaption,
  CupContent,
  CupEditToggle,
  CupGrid,
  CupHero,
  CupPanel,
  CupSeasonTabs,
  CupSection,
  CupStamp,
  CupThemeScope
} from './CupStyled';
import { cupHeadingFont, cupLabelFont, getCupTheme } from './cupThemes';
import { notifyCupsChanged, showCupError, useCup, useCupApi, useCupSeasonResults } from './useCup';

const CupEditModal = lazy(() => import('./admin/CupEditModal'));
const CupSeasonEditModal = lazy(() => import('./admin/CupSeasonEditModal'));
const CupRaceEditModal = lazy(() => import('./admin/CupRaceEditModal'));
const CupEventorRacePicker = lazy(() => import('./admin/CupEventorRacePicker'));
const CupRaceResultsModal = lazy(() => import('./admin/CupRaceResultsModal'));
const CupReportEditModal = lazy(() => import('./admin/CupReportEditModal'));
const CupDeleteCountdownModal = lazy(() => import('./admin/CupDeleteCountdownModal'));

interface IDeleteDialog {
  title: string;
  description: string;
  onDelete: () => Promise<void>;
}

/** The number of columns of a grid with auto-fill columns, measured on the element */
const useGridColumns = (minColumnWidth: number, gap: number) => {
  const [element, gridRef] = useState<HTMLElement | null>(null);
  const [columns, setColumns] = useState(4);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setColumns(Math.max(1, Math.floor((element.clientWidth + gap) / (minColumnWidth + gap))))
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, gap, minColumnWidth]);
  return { columns, gridRef };
};

const readLocalStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
};
const writeLocalStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not possible to remember, e.g. a private window
  }
};

type AdminDialog =
  | { type: 'cup' }
  | { type: 'season'; season?: ICupSeasonProps }
  | { type: 'race'; race?: ICupRaceProps }
  | { type: 'eventor' }
  | { type: 'results'; race: ICupRaceProps }
  | { type: 'report'; report?: ICupReportProps; cupRaceId?: number | null };

/* ----------------------------------------------------------- next race */

const NextRaceLayout = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 28px;
`;
const Countdown = styled.div`
  flex: 0 0 auto;
  min-width: 170px;
  padding: 16px 22px 14px 22px;
  background: var(--cup-ink);
  color: #ffffff;
  border: 3px solid var(--cup-ink);
  box-shadow: inset 0 0 0 3px var(--cup-accent2);
  text-align: center;
  transform: skewX(-6deg);

  strong {
    display: block;
    font-family: ${cupHeadingFont};
    font-weight: 400;
    font-size: clamp(72px, 10vw, 120px);
    line-height: 0.9;
    color: var(--cup-accent2);
  }
  span {
    font-family: ${cupLabelFont};
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
`;
const NextRaceInfo = styled.div`
  flex: 1 1 320px;
  min-width: 0;

  .cup-next-name {
    font-family: ${cupHeadingFont};
    font-weight: 400;
    font-size: clamp(32px, 5vw, 60px);
    line-height: 0.95;
    text-transform: uppercase;
    margin: 2px 0 10px 0;
    overflow-wrap: anywhere;
  }
  .cup-next-date {
    font-family: ${cupLabelFont};
    font-weight: 700;
    font-size: 20px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
`;

/* ---------------------------------------------------------- race ticket */

const Ticket = styled(CupPanel)<{ $next?: boolean; $done?: boolean }>`
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
  padding: 0;
  overflow: hidden;
  ${({ $next }) => ($next ? 'box-shadow: 9px 9px 0 var(--cup-highlight);' : '')}

  .cup-ticket-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px 18px 10px 18px;
    border-bottom: 3px dashed var(--cup-line);
    background: ${({ $next }) => ($next ? 'var(--cup-accent)' : 'transparent')};
    color: ${({ $next }) => ($next ? 'var(--cup-accent-text)' : 'inherit')};
  }
  .cup-ticket-head span {
    ${({ $next }) => ($next ? '-webkit-text-stroke-color: var(--cup-accent-text);' : '')}
  }
  .cup-ticket-date {
    text-align: right;
    font-family: ${cupLabelFont};
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 13px;
    line-height: 1.1;
  }
  .cup-ticket-date strong {
    display: block;
    font-family: ${cupHeadingFont};
    font-weight: 400;
    font-size: 38px;
    letter-spacing: 0;
    line-height: 1;
  }
  .cup-ticket-body {
    flex: 1;
    padding: 14px 18px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    opacity: ${({ $done }) => ($done ? 0.92 : 1)};
  }
  .cup-ticket-name {
    font-family: ${cupHeadingFont};
    font-weight: 400;
    font-size: 24px;
    line-height: 1.05;
    text-transform: uppercase;
    color: inherit !important;
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  .cup-ticket-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 4px 0 6px 0;
  }
  .cup-ticket-actions {
    margin-top: auto;
  }
`;

const CupPage = observer(() => {
  const { t } = useTranslation();
  const { slug, cupRaceId: cupRaceIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clubModel, sessionModel } = useMobxStore();
  const { remove } = useCupApi();
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState<AdminDialog>();
  const { cup } = useCup(slug, `${reloadKey}-${sessionModel.loggedIn}`);
  const isAdmin = sessionModel.loggedIn && sessionModel.isAdmin;
  // The administration is hidden until the discreet edit button is clicked, remembered in the browser
  const [editMode, setEditMode] = useState(() => readLocalStorage('cupEditMode', { on: false }).on);
  const editing = isAdmin && editMode;
  const toggleEditMode = () => {
    writeLocalStorage('cupEditMode', { on: !editMode });
    setEditMode(!editMode);
  };
  const [deleteDialog, setDeleteDialog] = useState<IDeleteDialog>();
  // One row of races, from the last decided race, until all races are shown
  const [allRaces, setAllRaces] = useState(false);
  const { columns: raceColumns, gridRef: raceGridRef } = useGridColumns(270, 30);
  const today = dayjs().format(dateFormat);

  const seasonIdParam = searchParams.get('season');
  const cupRaceId = cupRaceIdParam ? parseInt(cupRaceIdParam, 10) : undefined;
  const season = useMemo(() => {
    if (!cup) return undefined;
    if (cupRaceId) return cup.seasons.find(s => s.races.some(r => r.cupRaceId === cupRaceId));
    if (seasonIdParam) return cup.seasons.find(s => String(s.seasonId) === seasonIdParam);
    return getCurrentCupSeason(cup.seasons, today);
  }, [cup, cupRaceId, seasonIdParam, today]);
  const race = cupRaceId ? season?.races.find(r => r.cupRaceId === cupRaceId) : undefined;
  const results = useCupSeasonResults(season?.seasonId, reloadKey);
  const { globalStateModel } = useMobxStore();
  // A night page gets a black toolbar and the club logo in grayscale
  // On the cup page the next race decides the theme, if it has its own theme (e.g. a halloween premiere).
  // On the page of a race, the theme of that race.
  const upcomingRace = season ? getNextCupRace(season.races, today) : undefined;
  const pageThemeType = race ? (race.theme ?? cup?.theme) : (upcomingRace?.theme ?? cup?.theme);
  const isNightPage = pageThemeType === 'NIGHT' || pageThemeType === 'HALLOWEEN';
  useEffect(() => {
    globalStateModel.setDarkHeader(isNightPage);
    return () => globalStateModel.setDarkHeader(false);
  }, [globalStateModel, isNightPage]);

  const reload = () => {
    setDialog(undefined);
    setReloadKey(k => k + 1);
  };

  if (cup === undefined) {
    return (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    );
  }
  if (cup === null) {
    return <Alert showIcon type="error" title={t('cup.NotFound')} />;
  }

  // Empty = the colors of the theme, the club color is offered as a preset when editing the cup
  const primaryColor = cup.primaryColor;
  const cupTheme = getCupTheme(cup.theme, primaryColor, cup.secondaryColor);
  const pageTheme =
    pageThemeType !== cup.theme ? getCupTheme(pageThemeType, primaryColor, cup.secondaryColor) : cupTheme;
  const eventorUrl = clubModel.eventor?.url ?? 'https://eventor.orientering.se/Events';
  const entryUrl = (r: ICupRaceProps) => (r.eventorId ? `${eventorUrl}/Show/${r.eventorId}` : undefined);
  const eventorResultUrl = (r: ICupRaceProps) =>
    r.eventorId
      ? `${eventorUrl}/ResultList?eventId=${r.eventorId}${r.eventorRaceId ? `&eventRaceId=${r.eventorRaceId}` : ''}&groupBy=EventClass`
      : undefined;
  const races = [...(season?.races ?? [])].sort((a, b) => a.raceDate.localeCompare(b.raceDate));
  const nextRace = getNextCupRace(races, today);
  const pursuitRace = season ? getCupPursuitRace(races, season.settings) : undefined;
  const isPursuit = (r: ICupRaceProps) => r.cupRaceId === pursuitRace?.cupRaceId;
  const raceCaption = (r: ICupRaceProps) =>
    `${t('cup.RaceNumber', { number: raceNumber(r) })}${isPursuit(r) ? ` · ${t('cup.Pursuit')}` : ''}`;
  const raceHref = (r: ICupRaceProps) => `/cup/${cup.slug}/race/${r.cupRaceId}`;
  const raceNumber = (r: ICupRaceProps) => races.findIndex(x => x.cupRaceId === r.cupRaceId) + 1;
  const seasonReports = (season?.reports ?? []).filter(r => r.cupRaceId == null);
  const raceReports = (r: ICupRaceProps) => (season?.reports ?? []).filter(rep => rep.cupRaceId === r.cupRaceId);
  const raceHasResults = (r: ICupRaceProps) => (results ?? []).some(res => res.cupRaceId === r.cupRaceId);
  const countPersons = (list: ICupResultProps[]) => {
    const started = list.filter(
      r => r.status !== 'DNS' && (season?.settings.participants !== 'CLUB' || r.isClubMember)
    );
    const personOf = createCupPersonResolver(started);
    return new Set(started.map(personOf)).size;
  };
  const daysTo = (r: ICupRaceProps) => dayjs(r.raceDate).diff(dayjs(today), 'day');

  const onDelete = async (data: Record<string, unknown>, after?: () => void) => {
    try {
      await remove(data);
      if (after) after();
      else reload();
    } catch (e) {
      showCupError(e);
    }
  };

  const editToggle = (
    <CupEditToggle type="button" $active={editMode} aria-pressed={editMode} onClick={toggleEditMode}>
      <SettingOutlined /> {editMode ? t('cup.EditModeOff') : t('cup.EditModeOn')}
    </CupEditToggle>
  );

  const adminBar = editing ? (
    <CupAdminBar>
      <Button icon={<EditOutlined />} onClick={() => setDialog({ type: 'cup' })}>
        {t('cup.EditCup')}
      </Button>
      <Button icon={<PlusOutlined />} onClick={() => setDialog({ type: 'season' })}>
        {t('cup.NewSeason')}
      </Button>
      {season ? (
        <>
          <Button icon={<EditOutlined />} onClick={() => setDialog({ type: 'season', season })}>
            {t('cup.EditSeason')}
          </Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setDialog({ type: 'eventor' })}>
            {t('cup.AddEventorRaces')}
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setDialog({ type: 'race' })}>
            {t('cup.AddManualRace')}
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => setDialog({ type: 'report', cupRaceId: race?.cupRaceId ?? null })}
          >
            {t('cup.NewReport')}
          </Button>
          <Popconfirm
            title={t('cup.DeleteSeasonConfirm')}
            okText={t('common.Yes')}
            cancelText={t('common.No')}
            onConfirm={() =>
              setDeleteDialog({
                title: `${t('cup.DeleteSeason')} ${season.name}`,
                description: t('cup.DeleteSeasonConfirm'),
                onDelete: () =>
                  onDelete({ iType: 'SEASON', iSeasonId: season.seasonId }, () => {
                    setDeleteDialog(undefined);
                    setSearchParams({});
                    reload();
                  })
              })
            }
          >
            <Button danger icon={<DeleteOutlined />}>
              {t('cup.DeleteSeason')}
            </Button>
          </Popconfirm>
        </>
      ) : null}
      <Popconfirm
        title={t('cup.DeleteCupConfirm')}
        okText={t('common.Yes')}
        cancelText={t('common.No')}
        onConfirm={() =>
          setDeleteDialog({
            title: `${t('cup.DeleteCup')} ${cup.name}`,
            description: t('cup.DeleteCupConfirm'),
            onDelete: () =>
              onDelete({ iType: 'CUP', iCupId: cup.cupId }, () => {
                setDeleteDialog(undefined);
                notifyCupsChanged();
                navigate('/cups');
              })
          })
        }
      >
        <Button danger icon={<DeleteOutlined />}>
          {t('cup.DeleteCup')}
        </Button>
      </Popconfirm>
      {editToggle}
    </CupAdminBar>
  ) : null;

  const raceAdminButtons = (r: ICupRaceProps) =>
    editing ? (
      <div style={{ marginTop: 10 }}>
        <Button size="small" icon={<OrderedListOutlined />} onClick={() => setDialog({ type: 'results', race: r })}>
          {t('cup.Results')}
        </Button>{' '}
        <Button size="small" icon={<EditOutlined />} onClick={() => setDialog({ type: 'race', race: r })} />{' '}
        <Popconfirm
          title={t('cup.DeleteRaceConfirm')}
          okText={t('common.Yes')}
          cancelText={t('common.No')}
          onConfirm={() => onDelete({ iType: 'RACE', iCupRaceId: r.cupRaceId })}
        >
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    ) : null;

  const eventorButtons = (r: ICupRaceProps, upcoming: boolean, secondary = false) => (
    <>
      {upcoming && entryUrl(r) ? (
        <CupButton $secondary={secondary} href={entryUrl(r)} target="_blank" rel="noopener noreferrer">
          <CalendarOutlined /> {t('cup.EntryInEventor')}
        </CupButton>
      ) : null}
      {!upcoming && eventorResultUrl(r) ? (
        <CupButton $secondary href={eventorResultUrl(r)} target="_blank" rel="noopener noreferrer">
          <OrderedListOutlined /> {t('cup.ResultsInEventor')}
        </CupButton>
      ) : null}
    </>
  );

  const countdown = (r: ICupRaceProps) => {
    const days = daysTo(r);
    return (
      <Countdown>
        <strong>{days}</strong>
        <span>{days === 0 ? t('cup.RaceDay') : t('cup.DaysToGo', { count: days })}</span>
      </Countdown>
    );
  };

  const reportHandlers = {
    isAdmin: editing,
    onEdit: (report: ICupReportProps) => setDialog({ type: 'report', report }),
    onDelete: (report: ICupReportProps) => onDelete({ iType: 'REPORT', iReportId: report.reportId })
  };

  const statusStamp = (r: ICupRaceProps): ReactNode =>
    nextRace?.cupRaceId === r.cupRaceId ? (
      <CupStamp $color="var(--cup-highlight)">{t('cup.StampNext')}</CupStamp>
    ) : r.raceDate < today ? (
      <CupStamp $color="var(--cup-muted)">{t('cup.StampDone')}</CupStamp>
    ) : (
      <CupStamp $color="var(--cup-panel-text)">{t('cup.StampUpcoming')}</CupStamp>
    );

  const ticket = (r: ICupRaceProps) => {
    const upcoming = r.raceDate >= today;
    const isNext = nextRace?.cupRaceId === r.cupRaceId;
    const date = dayjs(r.raceDate);
    return (
      <Ticket key={r.cupRaceId} $next={isNext} $done={!upcoming}>
        <div className="cup-ticket-head">
          <CupBigNumber $size={64}>{String(raceNumber(r)).padStart(2, '0')}</CupBigNumber>
          <div className="cup-ticket-date">
            <strong>{date.format('D')}</strong>
            {formatCupDate(date, 'MMM YYYY')}
          </div>
        </div>
        <div className="cup-ticket-body">
          <Link to={raceHref(r)} className="cup-ticket-name">
            {r.name}
          </Link>
          <div className="cup-ticket-meta">
            {statusStamp(r)}
            {raceReports(r).length ? <FileTextOutlined title={t('cup.Report')} /> : null}
            {raceHasResults(r) ? <TrophyOutlined title={t('cup.Results')} /> : null}
          </div>
          <div className="cup-ticket-actions">
            <Link to={raceHref(r)}>
              <CupButton as="span" $secondary={!isNext}>
                {upcoming ? t('cup.MoreAboutRace') : t('cup.ResultsAndReport')}
              </CupButton>
            </Link>
            {upcoming && entryUrl(r) ? (
              <CupButton href={entryUrl(r)} target="_blank" rel="noopener noreferrer">
                <CalendarOutlined /> {t('cup.Entry')}
              </CupButton>
            ) : null}
            {raceAdminButtons(r)}
          </div>
        </div>
      </Ticket>
    );
  };

  const seasonSelector =
    cup.seasons.length > 1 && !race ? (
      <CupSeasonTabs role="group" aria-label={t('cup.Season')}>
        <span className="cup-season-label">{t('cup.Season')}</span>
        {[...cup.seasons]
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .map(s => (
            <button
              key={s.seasonId}
              type="button"
              aria-pressed={s.seasonId === season?.seasonId}
              onClick={() => setSearchParams({ season: String(s.seasonId) })}
            >
              {s.name}
            </button>
          ))}
      </CupSeasonTabs>
    ) : null;

  const raceResultsList = race ? (results ?? []).filter(r => r.cupRaceId === race.cupRaceId) : [];

  const raceContent = race ? (
    <>
      <div style={{ marginTop: 28 }}>
        <Link to={`/cup/${cup.slug}${season ? `?season=${season.seasonId}` : ''}`}>
          <CupButton $secondary as="span">
            <ArrowLeftOutlined /> {cup.name}
          </CupButton>
        </Link>
      </div>
      <CupSection index={1} title={race.raceDate >= today ? t('cup.TheRace') : t('cup.Summary')} />
      <CupPanel $accent={race.raceDate >= today}>
        {race.raceDate >= today ? <CupBurst>{t('cup.Upcoming')}</CupBurst> : null}
        <NextRaceLayout>
          {race.raceDate >= today ? countdown(race) : null}
          <NextRaceInfo>
            <CupCaption>{raceCaption(race)}</CupCaption>
            <div className="cup-next-name">{race.name}</div>
            <div className="cup-next-date">
              {formatCupDate(race.raceDate, 'dddd D MMMM YYYY')}
              {race.useTotalResult ? ` · ${t('cup.UseTotalResult')}` : ''}
            </div>
            {eventorButtons(race, race.raceDate >= today, race.raceDate >= today)}
            {raceAdminButtons(race)}
          </NextRaceInfo>
        </NextRaceLayout>
      </CupPanel>
      {raceReports(race).length ? (
        <>
          <CupSection index={2} title={t('cup.Report')} />
          <CupReports reports={raceReports(race)} {...reportHandlers} />
        </>
      ) : null}
      {isPursuit(race) && season && results ? (
        <>
          <CupSection index={raceReports(race).length ? 3 : 2} title={t('cup.PursuitStartList')} />
          <CupPanel>
            <CupPursuitStartList
              races={races}
              results={results}
              settings={season.settings}
              seasonYear={parseInt(season.startDate.substring(0, 4), 10)}
              name={`${cup.name} ${season.name} ${t('cup.PursuitStartList')}`}
            />
          </CupPanel>
        </>
      ) : null}
      <CupSection index={(raceReports(race).length ? 3 : 2) + (isPursuit(race) ? 1 : 0)} title={t('cup.Results')} />
      <CupPanel>
        {results && season ? (
          <CupRaceResults
            cupRaceId={race.cupRaceId}
            results={results}
            settings={season.settings}
            hidePoints={isPursuit(race)}
          />
        ) : (
          <Spin />
        )}
      </CupPanel>
      {clubModel.social ? (
        <>
          <CupSection
            index={(raceReports(race).length ? 4 : 3) + (isPursuit(race) ? 1 : 0)}
            title={t('social.Comments')}
          />
          <CupPanel>
            <SocialSection targetType="CUP_RACE" targetId={race.cupRaceId} />
          </CupPanel>
        </>
      ) : null}
    </>
  ) : null;

  const seasonContent = (
    <>
      {seasonSelector}
      {cup.description ? (
        <div style={{ marginTop: 32 }}>
          <CupBubble>{cup.description}</CupBubble>
        </div>
      ) : null}
      {!season ? (
        <>
          <CupSection title={t('cup.Season')} />
          <CupPanel>
            <p>{t('cup.NoSeasons')}</p>
          </CupPanel>
        </>
      ) : (
        <>
          {nextRace ? (
            <>
              <CupSection index={1} title={t('cup.NextRace')} />
              <CupPanel $accent>
                <CupBurst>{t('cup.NextRaceBurst')}</CupBurst>
                <NextRaceLayout>
                  {countdown(nextRace)}
                  <NextRaceInfo>
                    <CupCaption>{raceCaption(nextRace)}</CupCaption>
                    <div className="cup-next-name">{nextRace.name}</div>
                    <div className="cup-next-date">{formatCupDate(nextRace.raceDate, 'dddd D MMMM YYYY')}</div>
                    {eventorButtons(nextRace, true, true)}
                    <Link to={raceHref(nextRace)}>
                      <CupButton $secondary as="span">
                        {t('cup.MoreAboutRace')}
                      </CupButton>
                    </Link>
                  </NextRaceInfo>
                </NextRaceLayout>
              </CupPanel>
            </>
          ) : null}

          <CupSection index={nextRace ? 2 : 1} title={t('cup.Standings')} />
          {results ? (
            <CupStandings
              races={races}
              results={results}
              settings={season.settings}
              seasonYear={parseInt(season.startDate.substring(0, 4), 10)}
            />
          ) : (
            <SpinnerDiv>
              <Spin size="large" />
            </SpinnerDiv>
          )}

          <CupSection
            index={nextRace ? 3 : 2}
            title={t('cup.Races')}
            count={t('cup.RacesDecided', {
              decided: races.filter(r => r.raceDate < today).length,
              count: races.length
            })}
          />
          {races.length === 0 ? (
            <CupPanel>
              <p>{t('cup.NoRaces')}</p>
            </CupPanel>
          ) : (
            (() => {
              // One row: the last decided race and the coming ones, or the last row when all are decided
              const nextIndex = nextRace ? races.findIndex(r => r.cupRaceId === nextRace.cupRaceId) : races.length;
              const first = Math.max(0, Math.min(nextIndex - 1, races.length - raceColumns));
              const shown = allRaces ? races : races.slice(first, first + raceColumns);
              return (
                <>
                  <CupGrid ref={raceGridRef} $min={270}>
                    {shown.map(ticket)}
                  </CupGrid>
                  {shown.length < races.length ? (
                    <div style={{ marginTop: 26 }}>
                      <CupButton $secondary as="button" type="button" onClick={() => setAllRaces(true)}>
                        <DownOutlined /> {t('cup.ShowAllRaces', { count: races.length })}
                      </CupButton>
                    </div>
                  ) : null}
                </>
              );
            })()
          )}

          {seasonReports.length ? (
            <>
              <CupSection index={nextRace ? 4 : 3} title={t('cup.SeasonReport')} />
              <CupReports reports={seasonReports} {...reportHandlers} />
            </>
          ) : null}
        </>
      )}
    </>
  );

  const finishedRaces = races.filter(r => r.raceDate < today).length;
  const heroStats = race
    ? [
        { value: raceNumber(race), label: t('cup.RaceOf', { count: races.length }) },
        ...(raceResultsList.length
          ? [
              { value: countPersons(raceResultsList), label: t('cup.Participants') },
              { value: new Set(raceResultsList.map(r => r.className)).size, label: t('cup.Classes') }
            ]
          : [])
      ]
    : season
      ? [
          { value: races.length, label: t('cup.Races') },
          { value: finishedRaces, label: t('cup.Decided') },
          ...(results && results.length ? [{ value: countPersons(results), label: t('cup.Participants') }] : []),
          ...(nextRace ? [{ value: daysTo(nextRace), label: t('cup.DaysToNext') }] : [])
        ]
      : [];

  return (
    <CupThemeScope theme={pageTheme}>
      <CupHero
        theme={pageTheme}
        kicker={race ? cup.name : season ? `${t('cup.Season')} ${season.name}` : undefined}
        title={race ? race.name : cup.name}
        subtitle={
          race
            ? formatCupDate(race.raceDate, 'D MMMM YYYY')
            : season
              ? `${formatCupDate(season.startDate, 'D MMM')} – ${formatCupDate(season.endDate, 'D MMM YYYY')}`
              : undefined
        }
        stats={heroStats}
      />
      <CupContent>
        {isAdmin && !editing ? editToggle : null}
        {adminBar}
        {!cup.isActive ? <Alert showIcon type="warning" title={t('cup.NotActive')} style={{ marginTop: 20 }} /> : null}
        {race ? raceContent : seasonContent}
      </CupContent>
      <Suspense fallback={null}>
        {deleteDialog ? (
          <CupDeleteCountdownModal
            title={deleteDialog.title}
            description={deleteDialog.description}
            onDelete={deleteDialog.onDelete}
            onClose={() => setDeleteDialog(undefined)}
          />
        ) : null}
        {dialog?.type === 'cup' ? (
          <CupEditModal
            open
            cup={cup}
            onClose={() => setDialog(undefined)}
            onSaved={saved => {
              setDialog(undefined);
              if (saved.slug !== cup.slug) navigate(`/cup/${saved.slug}`, { replace: true });
              else reload();
            }}
          />
        ) : null}
        {dialog?.type === 'season' ? (
          <CupSeasonEditModal
            open
            cupId={cup.cupId}
            season={dialog.season}
            classNames={dialog.season ? Array.from(new Set((results ?? []).map(r => r.className))) : []}
            onClose={() => setDialog(undefined)}
            onSaved={seasonId => {
              setSearchParams({ season: String(seasonId) });
              reload();
            }}
          />
        ) : null}
        {dialog?.type === 'race' && season ? (
          <CupRaceEditModal
            open
            season={season}
            race={dialog.race}
            onClose={() => setDialog(undefined)}
            onSaved={reload}
          />
        ) : null}
        {dialog?.type === 'eventor' && season ? (
          <CupEventorRacePicker open season={season} onClose={() => setDialog(undefined)} onSaved={reload} />
        ) : null}
        {dialog?.type === 'results' && season ? (
          <CupRaceResultsModal
            open
            season={season}
            race={dialog.race}
            results={results ?? []}
            onClose={() => setDialog(undefined)}
            onSaved={reload}
          />
        ) : null}
        {dialog?.type === 'report' && season ? (
          <CupReportEditModal
            open
            season={season}
            report={dialog.report}
            cupRaceId={dialog.cupRaceId}
            onClose={() => setDialog(undefined)}
            onSaved={reload}
          />
        ) : null}
      </Suspense>
    </CupThemeScope>
  );
});

export default CupPage;
