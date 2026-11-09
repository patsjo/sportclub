import { CopyOutlined, ExportOutlined, SnippetsOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Row, Select, Space, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { lightConditions, LightConditionTypes } from '../../utils/resultConstants';
import { useResultWizardStore } from '../../utils/resultWizardStore';
import {
  FormatRankingPoints,
  GetSverigelistanOptions,
  ISverigelistanData,
  ISverigelistanOption,
  ParseSverigelistanClipboard,
  SverigelistanBookmarklet,
  SverigelistanEventsUrl,
  SverigelistanOtherEvent,
  SverigelistanTooEarly
} from '../../utils/sverigelistanHelper';

// The names of races and runners are shown by React, not as HTML
const noEscape = { interpolation: { escapeValue: false } };

interface ISverigelistanRankingProps {
  /** The class to base the ranking on, its time per kilometer and points in Sverigelistan */
  onChoose: (option: ISverigelistanOption) => void;
}

/**
 * The ranking points of Sverigelistan. The pages have a browser check that the app cannot read through, so a
 * bookmarklet reads them in Eventor and copies them, and they are pasted here. The best H21 class is chosen.
 */
const SverigelistanRanking = observer(({ onChoose }: ISverigelistanRankingProps) => {
  const { t } = useTranslation();
  const { raceWizardModel } = useResultWizardStore();
  const raceEvent = raceWizardModel.raceEvent;
  const [data, setData] = useState<ISverigelistanData>();
  const [error, setError] = useState<string>();
  const [chosen, setChosen] = useState<string>();
  const bookmarkRef = useRef<HTMLAnchorElement>(null);
  const bookmarkName = t('results.SverigelistanBookmark');

  const bookmarklet = useMemo(
    () =>
      SverigelistanBookmarklet({
        wrongPage: t('results.SverigelistanBookmarkletWrongPage'),
        fetching: t('results.SverigelistanBookmarkletFetching'),
        failed: t('results.SverigelistanBookmarkletFailed'),
        noPoints: t('results.SverigelistanBookmarkletNoPoints'),
        ready: t('results.SverigelistanBookmarkletReady'),
        copy: t('results.SverigelistanBookmarkletCopy'),
        copied: t('results.SverigelistanBookmarkletCopied'),
        copyManually: t('results.SverigelistanBookmarkletCopyManually'),
        close: t('results.SverigelistanBookmarkletClose')
      }),
    [t]
  );
  // React does not render a javascript: link, it is set on the element
  useEffect(() => {
    bookmarkRef.current?.setAttribute('href', bookmarklet);
  }, [bookmarklet]);

  const sportCode = raceEvent?.sportCode ?? 'OL';
  const lightCondition = (raceEvent?.raceLightCondition ?? lightConditions.day) as LightConditionTypes;
  const { options, base, unmatched } = useMemo(
    () =>
      data
        ? GetSverigelistanOptions(data, raceWizardModel.raceWinnerResults, sportCode, lightCondition)
        : { options: [], base: undefined, unmatched: [] },
    [data, raceWizardModel.raceWinnerResults, sportCode, lightCondition]
  );

  const apply = useCallback(
    (text: string) => {
      setError(undefined);
      const parsed = ParseSverigelistanClipboard(text);
      if (!parsed) {
        setError(t('results.SverigelistanInvalid', { bookmark: bookmarkName, ...noEscape }));
        return;
      }
      if (!parsed.classes.some(c => c.points != null)) {
        setData(undefined);
        setError(t('results.SverigelistanNoPoints', { eventName: parsed.eventName, ...noEscape }));
        return;
      }
      setData(parsed);
      const found = GetSverigelistanOptions(parsed, raceWizardModel.raceWinnerResults, sportCode, lightCondition);
      setChosen(found.base?.className);
      if (found.base) onChoose(found.base);
    },
    [bookmarkName, lightCondition, onChoose, raceWizardModel.raceWinnerResults, sportCode, t]
  );

  // Ctrl+V anywhere on the page, when the button cannot read the clipboard. Only the ranking of Sverigelistan is
  // taken, anything else is pasted as usual.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text');
      if (!text || !ParseSverigelistanClipboard(text)) return;
      event.preventDefault();
      apply(text);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [apply]);

  if (!raceEvent) return null;

  const paste = () => {
    if (!navigator.clipboard?.readText) {
      setError(t('results.SverigelistanClipboardFailed', { message: 'navigator.clipboard', ...noEscape }));
      return;
    }
    navigator.clipboard.readText().then(apply, (reason: unknown) =>
      setError(
        t('results.SverigelistanClipboardFailed', {
          message: reason instanceof Error ? reason.message : String(reason),
          ...noEscape
        })
      )
    );
  };

  const label = (option: ISverigelistanOption) =>
    `${option.className} – ${option.personName}${
      option.place != null && option.place !== 1 ? ` (${t('results.SverigelistanPlace', { place: option.place })})` : ''
    }: ${FormatRankingPoints(option.points)} (${option.timePerKilometer.substring(3, 8)} min/km${
      option.basedOn
        ? `, ${t('results.SverigelistanBasedOn', {
            className: option.basedOn.className,
            points: FormatRankingPoints(option.basedOn.points),
            ...noEscape
          })}`
        : ''
    })`;

  const tooEarly = SverigelistanTooEarly(raceEvent.raceDate, dayjs().format('YYYY-MM-DD'));

  return (
    <>
      {tooEarly && !data ? (
        <Alert showIcon type="warning" title={t('results.SverigelistanTooEarly')} style={{ marginTop: 8 }} />
      ) : null}
      {/* The name of the link is the name of the bookmark, the instruction is around it */}
      <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
        {t('results.SverigelistanBookmarkBefore')} {/* On the link only, the paragraph is as wide as the page */}
        <Tooltip title={t('results.SverigelistanBookmarkTooltip')}>
          <span>
            {/* A link, to be dragged to the bookmarks bar. A click here would run it on this page. */}
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <a ref={bookmarkRef} style={{ cursor: 'grab' }} onClick={e => e.preventDefault()}>
              <CopyOutlined /> {bookmarkName}
            </a>
          </span>
        </Tooltip>{' '}
        {t('results.SverigelistanBookmarkAfter')}
      </Typography.Paragraph>
      <Row gutter={8} style={{ marginTop: 8 }} align="middle">
        <Col>
          <Space wrap>
            <Tooltip title={t('results.SverigelistanOpenTooltip', { bookmark: bookmarkName, ...noEscape })}>
              <Button
                icon={<ExportOutlined />}
                href={SverigelistanEventsUrl(sportCode, raceEvent.raceDate)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {raceEvent.raceDate
                  ? t('results.SverigelistanOpenDate', { date: raceEvent.raceDate })
                  : t('results.SverigelistanOpen')}
              </Button>
            </Tooltip>
            <Button type="primary" icon={<SnippetsOutlined />} onClick={paste}>
              {t('results.SverigelistanPaste')}
            </Button>
          </Space>
        </Col>
      </Row>
      {error ? (
        <Typography.Paragraph type="danger" style={{ marginTop: 8, marginBottom: 0 }}>
          {error}
        </Typography.Paragraph>
      ) : null}
      {data ? (
        <div style={{ marginTop: 8 }}>
          <Typography.Paragraph style={{ marginBottom: 4 }}>
            {data.url ? (
              <a href={data.url} target="_blank" rel="noopener noreferrer">
                {t('results.SverigelistanLoaded', {
                  eventName: data.eventName,
                  count: data.classes.filter(c => c.points != null).length,
                  ...noEscape
                })}
              </a>
            ) : (
              t('results.SverigelistanLoaded', {
                eventName: data.eventName,
                count: data.classes.filter(c => c.points != null).length,
                ...noEscape
              })
            )}
          </Typography.Paragraph>
          {SverigelistanOtherEvent(data, raceEvent.name) ? (
            <Typography.Paragraph type="warning" style={{ marginBottom: 4 }}>
              {t('results.SverigelistanOtherEvent', { eventName: data.eventName, ...noEscape })}
            </Typography.Paragraph>
          ) : null}
          {!options.length ? (
            <Typography.Paragraph type="warning" style={{ marginBottom: 4 }}>
              {t('results.SverigelistanNoMatch', { classes: unmatched.join(', '), ...noEscape })}
            </Typography.Paragraph>
          ) : !base ? (
            <Typography.Paragraph type="warning" style={{ marginBottom: 4 }}>
              {t('results.SverigelistanNoH21')}
            </Typography.Paragraph>
          ) : null}
          {options.length ? (
            <Select
              style={{ width: '100%' }}
              popupMatchSelectWidth={false}
              placeholder={t('results.Sverigelistan')}
              value={chosen}
              options={options.map(option => ({ value: option.className, label: label(option) }))}
              onChange={(className: string) => {
                const option = options.find(o => o.className === className);
                setChosen(className);
                if (option) onChoose(option);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
});

export default SverigelistanRanking;
