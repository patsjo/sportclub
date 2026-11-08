import {
  CaretDownOutlined,
  CaretUpOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  ExclamationCircleFilled,
  LoadingOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { Button, Progress, theme, Typography } from 'antd';
import { TFunction } from 'i18next';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { FetchError, FetchPhase } from '../../utils/api';

export type LoadTaskStatus = 'wait' | 'process' | 'finish' | 'warning' | 'error' | 'skipped';

/** How the bar of a task shows how far it has come, percent when the text already tells the numbers */
export type LoadProgressUnit = 'count' | 'bytes' | 'percent';

export interface ILoadTask {
  key: string;
  title: string;
  status: LoadTaskStatus;
  /** A short text after the title, e.g. the number of results or why it failed */
  detail?: string;
  /** For a task with many parts, e.g. one request per competitor, or the bytes of a download */
  progress?: { done: number; total: number; unit?: LoadProgressUnit };
  /** When the task started, a task that takes long shows its own time */
  startedAt?: number;
}

/**
 * The tasks of a load with many requests, shown with LoadProgress, so that the user sees what is done
 * and how far it has come. The functions are stable and can be used inside effects.
 */
export const useLoadProgress = () => {
  const [tasks, setTasks] = useState<ILoadTask[]>([]);
  const [startedAt, setStartedAt] = useState<number>();
  // The running task and the titles, kept between the calls of a load
  const state = useRef<{ running?: string; titles: Map<string, string> }>({ titles: new Map() });
  const api = useMemo(() => {
    const update = (key: string, values: Partial<ILoadTask>) =>
      setTasks(list => list.map(task => (task.key === key ? { ...task, ...values } : task)));
    return {
      /** Starts a new load with these tasks, all waiting */
      reset: (list: { key: string; title: string }[]) => {
        state.current.running = undefined;
        state.current.titles = new Map(list.map(task => [task.key, task.title]));
        setTasks(list.map(task => ({ ...task, status: 'wait' })));
        setStartedAt(Date.now());
      },
      start: (key: string, detail?: string) => {
        state.current.running = key;
        update(key, { status: 'process', detail, progress: undefined, startedAt: Date.now() });
      },
      /** How far a task with many parts has come, a total of 0 shows only the text */
      progress: (key: string, done: number, total: number, detail?: string, unit: LoadProgressUnit = 'count') =>
        update(key, { progress: { done, total, unit }, detail }),
      finish: (key: string, detail?: string) => {
        if (state.current.running === key) state.current.running = undefined;
        update(key, { status: 'finish', detail, progress: undefined });
      },
      /** Failed, but the load continues. Returns the title, for the list of warnings */
      warn: (key: string, detail?: string) => {
        if (state.current.running === key) state.current.running = undefined;
        update(key, { status: 'warning', detail, progress: undefined });
        return state.current.titles.get(key) ?? key;
      },
      /** The title of a task, e.g. to tell which task made up for another */
      title: (key: string) => state.current.titles.get(key) ?? key,
      /** Not needed, the task is not shown. With a detail it is shown, to tell why it was skipped */
      skip: (key: string, detail?: string) => {
        if (state.current.running === key) state.current.running = undefined;
        update(key, { status: 'skipped', detail, progress: undefined });
      },
      /** The tasks that never started are not needed */
      skipWaiting: () =>
        setTasks(list => list.map(task => (task.status === 'wait' ? { ...task, status: 'skipped' } : task))),
      /** The load stopped, the running task failed */
      fail: (detail?: string) => {
        if (state.current.running) update(state.current.running, { status: 'error', detail, progress: undefined });
        state.current.running = undefined;
      }
    };
  }, []);
  // The tasks change, the api is the same for every render
  return { tasks, startedAt, api };
};

const StyledLoadProgress = styled.div`
  max-width: 640px;
  margin: 24px auto;
  padding: 20px 24px;
  border-radius: 8px;
`;
const TaskRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 4px 0;
`;
const TaskTitle = styled.div`
  flex: 1;
  min-width: 0;
`;

interface ILoadProgressProps {
  title: ReactNode;
  tasks: ILoadTask[];
  startedAt?: number;
  /** Shown in an alert, no running time and no border */
  embedded?: boolean;
}

/** What a load with many requests is doing, and how far it has come */
export const LoadProgress = ({ title, tasks, startedAt, embedded }: ILoadProgressProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  // A skipped task is shown only when it tells why it was skipped
  const shown = tasks.filter(task => task.status !== 'skipped' || task.detail);
  const running = shown.some(task => task.status === 'process' || task.status === 'wait');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running || embedded) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [embedded, running]);

  // A task with many parts counts by its parts
  const done = shown.reduce(
    (sum, task) =>
      sum +
      (task.status === 'finish' || task.status === 'warning' || task.status === 'error' || task.status === 'skipped'
        ? 1
        : task.status === 'process' && task.progress && task.progress.total > 0
          ? task.progress.done / task.progress.total
          : 0),
    0
  );
  const percent = shown.length ? Math.floor((100 * done) / shown.length) : 0;
  const failed = shown.some(task => task.status === 'error');
  const seconds = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : null;
  const megabytes = (bytes: number) =>
    (bytes / 1000000).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const formatProgress = (progress: NonNullable<ILoadTask['progress']>) =>
    progress.unit === 'bytes'
      ? `${megabytes(progress.done)} / ${megabytes(progress.total)} MB`
      : progress.unit === 'percent'
        ? `${Math.floor((100 * progress.done) / progress.total)} %`
        : `${progress.done.toLocaleString('sv-SE')}/${progress.total.toLocaleString('sv-SE')}`;

  const icon = (status: LoadTaskStatus) => {
    switch (status) {
      case 'process':
        return <LoadingOutlined style={{ color: token.colorPrimary }} />;
      case 'finish':
        return <CheckCircleFilled style={{ color: token.colorSuccess }} />;
      case 'warning':
        return <ExclamationCircleFilled style={{ color: token.colorWarning }} />;
      case 'error':
        return <CloseCircleFilled style={{ color: token.colorError }} />;
      case 'skipped':
        return <MinusCircleOutlined style={{ color: token.colorTextTertiary }} />;
      default:
        return <ClockCircleOutlined style={{ color: token.colorTextQuaternary }} />;
    }
  };

  const list = shown.map(task => (
    <TaskRow key={task.key}>
      {icon(task.status)}
      <TaskTitle>
        <Typography.Text type={task.status === 'wait' ? 'secondary' : undefined} strong={task.status === 'process'}>
          {task.title}
        </Typography.Text>
        {task.detail ? (
          <Typography.Text
            type={task.status === 'error' ? 'danger' : task.status === 'warning' ? 'warning' : 'secondary'}
          >
            {' '}
            – {task.detail}
          </Typography.Text>
        ) : null}
        {task.status === 'process' && task.progress && task.progress.total > 0 ? (
          <Progress
            size="small"
            percent={Math.floor((100 * task.progress.done) / task.progress.total)}
            format={() => formatProgress(task.progress!)}
          />
        ) : null}
      </TaskTitle>
      {/* The time of a task that takes more than a few seconds */}
      {task.status === 'process' && task.startedAt && !embedded && now - task.startedAt >= 3000 ? (
        <Typography.Text type="secondary">
          {t('results.LoadElapsed', { seconds: Math.round((now - task.startedAt) / 1000) })}
        </Typography.Text>
      ) : null}
    </TaskRow>
  ));

  if (embedded) return <div style={{ marginTop: 8 }}>{list}</div>;

  return (
    <StyledLoadProgress style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <Typography.Text strong>{title}</Typography.Text>
        {seconds != null ? (
          <Typography.Text type="secondary">{t('results.LoadElapsed', { seconds })}</Typography.Text>
        ) : null}
      </div>
      <Progress
        percent={percent}
        status={failed ? 'exception' : running ? 'active' : 'normal'}
        style={{ margin: '8px 0 12px 0' }}
      />
      {list}
    </StyledLoadProgress>
  );
};

/** A part of a load that failed, with where and why, so that it can be put right */
export interface ILoadWarning {
  key: string;
  title: string;
  /** Why, in a few words, e.g. "could not be fetched (HTTP 403)" */
  short: string;
  message: string;
  /** What is likely wrong and what to do about it */
  hint?: string;
  /** The address that was asked, e.g. the url in Eventor */
  url?: string;
  /** HTTP status, attempts, how far it came and where on the server */
  details: string[];
  /** Another source was loaded instead, the problem is solved */
  resolvedBy?: string;
}

/** The status code Eventor answered with, the proxy tells it in the message */
const eventorStatus = (message: string) => {
  const match = /status code (\d{3})/i.exec(message);
  return match ? parseInt(match[1], 10) : undefined;
};

/** Why a part of the load failed, with a hint of what to do */
export const toLoadWarning = (t: TFunction, key: string, title: string, error: unknown, url?: string): ILoadWarning => {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : t('results.LoadRaceUnknownError');
  const fetchError = error instanceof FetchError ? error : undefined;
  const status = eventorStatus(message) ?? fetchError?.status;
  const phase: FetchPhase | undefined = fetchError?.phase;

  let hint: string | undefined;
  if (/just a moment|cloudflare|cf-chl|challenge/i.test(message)) hint = t('results.LoadHintBrowserCheck');
  else if (status === 401 || status === 403) hint = t('results.LoadHintAccess');
  else if (status === 404) hint = t('results.LoadHintNotFound');
  else if (/closed the connection before the answer/i.test(message)) hint = t('results.LoadHintConnectionClosed');
  else if (/server stopped while/i.test(message)) hint = t('results.LoadHintServerStopped');
  else if (/timed out|timeout/i.test(message)) hint = t('results.LoadHintTimeout');
  else if (/parse the XML/i.test(message)) hint = t('results.LoadHintXml');
  else if (/not a IOF XML|version 3\.0/i.test(message)) hint = t('results.LoadHintNotIof');
  else if (status != null && status >= 500) hint = t('results.LoadHintServer');
  else if (fetchError && fetchError.status == null && phase === 'connecting') hint = t('results.LoadHintNetwork');
  else if (fetchError && fetchError.status == null && phase === 'downloading') hint = t('results.LoadHintInterrupted');
  else if (phase === 'parsing' || error instanceof SyntaxError) hint = t('results.LoadHintParse');

  const details: string[] = [];
  if (fetchError?.status != null)
    details.push(
      t('results.LoadDetailStatus', {
        status: `${fetchError.status}${fetchError.statusText ? ' ' + fetchError.statusText : ''}`
      })
    );
  const eventor = eventorStatus(message);
  if (eventor != null && eventor !== fetchError?.status)
    details.push(t('results.LoadDetailEventorStatus', { status: eventor }));
  if (phase) details.push(t('results.LoadDetailPhase', { phase: t(`results.LoadPhase_${phase}`) }));
  if (fetchError && fetchError.attempts > 1)
    details.push(t('results.LoadDetailAttempts', { count: fetchError.attempts }));
  if (fetchError?.serverFile)
    details.push(
      t('results.LoadDetailServer', {
        file: fetchError.serverFile.split(/[\\/]/).pop(),
        line: fetchError.serverLine ?? '?'
      })
    );
  if (!fetchError && error instanceof Error && error.name && error.name !== 'Error')
    details.push(t('results.LoadDetailType', { type: error.name }));

  return { key, title, short: loadWarningShort(t, error), message, hint, url, details };
};

/** The short reason in the list of tasks, e.g. "could not be fetched (HTTP 500)" */
export const loadWarningShort = (t: TFunction, error?: unknown) => {
  const message = error instanceof Error ? error.message : '';
  const status = eventorStatus(message) ?? (error instanceof FetchError ? error.status : undefined);
  return status != null ? `${t('results.LoadTaskFailed')} (HTTP ${status})` : t('results.LoadTaskFailed');
};

/** Details that are hidden until the user asks for them */
export const ExpandableDetails = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <Button
        type="link"
        size="small"
        style={{ padding: 0, height: 'auto' }}
        icon={expanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
      >
        {expanded ? t('results.LoadHideDetails') : t('results.LoadShowDetails')}
      </Button>
      {expanded ? children : null}
    </>
  );
};

/**
 * The parts of a load that failed. What failed, and whether another source made up for it, is shown at once,
 * why and where (the message of the server, a hint, the HTTP status and the url) when the user expands it.
 */
export const LoadWarningList = ({ warnings }: { warnings: ILoadWarning[] }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (warnings.length === 0) return null;
  return (
    <>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {warnings.map(warning => (
          <li key={warning.key} style={{ marginBottom: expanded ? 8 : 2 }}>
            <Typography.Text strong>{warning.title}</Typography.Text> – {warning.short}
            {warning.resolvedBy ? (
              <div>
                <Typography.Text type="success">{warning.resolvedBy}</Typography.Text>
              </div>
            ) : null}
            {expanded ? (
              <>
                <div style={{ wordBreak: 'break-word' }}>{warning.message}</div>
                {warning.hint ? (
                  <div>
                    <Typography.Text type="secondary">{warning.hint}</Typography.Text>
                  </div>
                ) : null}
                {warning.details.length ? (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {warning.details.join(' · ')}
                    </Typography.Text>
                  </div>
                ) : null}
                {warning.url ? (
                  <div style={{ wordBreak: 'break-all', fontSize: 12 }}>
                    <Typography.Text type="secondary">{t('results.LoadDetailUrl')} </Typography.Text>
                    <Typography.Text code copyable style={{ fontSize: 12 }}>
                      {warning.url}
                    </Typography.Text>
                  </div>
                ) : null}
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <Button
        type="link"
        size="small"
        style={{ padding: 0, height: 'auto', marginTop: 4 }}
        icon={expanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
      >
        {expanded ? t('results.LoadHideDetails') : t('results.LoadShowDetails')}
      </Button>
    </>
  );
};
