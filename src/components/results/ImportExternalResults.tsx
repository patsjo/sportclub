import { CopyOutlined, ImportOutlined, SnippetsOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Col, Input, Row, Select, Tooltip, Typography, Upload } from 'antd';
import { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IResultListType } from '../../models/iof.xsd-3.0';
import { IofXmlToJson } from '../../utils/iofXmlToJson';
import { ParsePastedResults, ResultsBookmarklet } from '../../utils/resultPages';
import { FetchWinSplitsResults, ToExternalResultList, WinSplitsDatabaseId } from '../../utils/resultSources';
import FormItem from '../formItems/FormItem';

// The names of races and files are shown by React, not as HTML
const noEscape = { interpolation: { escapeValue: false } };

type ImportSource = 'winsplits' | 'page' | 'iofXmlFile';

/** Reads the results, telling how far it has come */
export type LoadExternalResults = (progress: (text: string) => void) => Promise<IResultListType>;

/**
 * The results copied by the bookmarklet (or an IOF XML file it copied), read from the clipboard. The error tells why
 * not, in the words of the user.
 */
export const ReadPastedResults = async (t: TFunction): Promise<IResultListType> => {
  if (!navigator.clipboard?.readText)
    throw new Error(t('results.SverigelistanClipboardFailed', { message: 'navigator.clipboard', ...noEscape }));
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch (reason) {
    throw new Error(
      t('results.SverigelistanClipboardFailed', {
        message: reason instanceof Error ? reason.message : String(reason),
        ...noEscape
      })
    );
  }
  const results = ParsePastedResults(text);
  if (!results)
    throw new Error(t('results.ImportPageInvalid', { bookmark: t('results.ImportPageBookmark'), ...noEscape }));
  return results;
};

interface IImportExternalResultsProps {
  eventorCorsProxy?: string;
  importing: boolean;
  clubNames: string;
  onClubNamesChange: (clubNames: string) => void;
  onImport: (load: LoadExternalResults) => void;
  onError: (message: string) => void;
}

/**
 * The sources of results of a race that is not in the Eventor of the club: WinSplits Online (by the proxy), a page of
 * results read by a bookmarklet in the browser (another Eventor, e.g. IOF, tulospalvelu.fi, SPORTident Center, or an
 * IOF XML file shown by the browser, e.g. of FISO), or an IOF XML file.
 */
const ImportExternalResults = ({
  eventorCorsProxy,
  importing,
  clubNames,
  onClubNamesChange,
  onImport,
  onError
}: IImportExternalResultsProps) => {
  const { t } = useTranslation();
  const [source, setSource] = useState<ImportSource>('winsplits');
  const [link, setLink] = useState('');
  const bookmarkRef = useRef<HTMLAnchorElement>(null);
  const bookmarkName = t('results.ImportPageBookmark');

  const bookmarklet = useMemo(
    () =>
      ResultsBookmarklet({
        title: t('results.ImportPageBookmark'),
        wrongPage: t('results.ImportPageBookmarkletWrongPage'),
        fetching: t('results.ImportPageBookmarkletFetching'),
        failed: t('results.ImportPageBookmarkletFailed'),
        ready: t('results.ImportPageBookmarkletReady'),
        collected: t('results.ImportPageBookmarkletCollected'),
        notKept: t('results.ImportPageBookmarkletNotKept'),
        closeAndContinue: t('results.ImportPageBookmarkletCloseAndContinue'),
        copiedTitle: t('results.SverigelistanBookmarkletCopiedTitle'),
        copied: t('results.ImportPageBookmarkletCopied'),
        copyManually: t('results.SverigelistanBookmarkletCopyManually'),
        close: t('results.SverigelistanBookmarkletClose')
      }),
    [t]
  );
  // React does not render a javascript: link, it is set on the element
  useEffect(() => {
    bookmarkRef.current?.setAttribute('href', bookmarklet);
  }, [bookmarklet, source]);

  const importLink = () => {
    if (!eventorCorsProxy) return;
    const databaseId = WinSplitsDatabaseId(link);
    if (!databaseId) {
      onError(t('results.ImportInvalidWinSplitsLink'));
      return;
    }
    onImport(progress =>
      FetchWinSplitsResults(eventorCorsProxy, databaseId, (index, total, name) =>
        progress(t('results.ImportClassProgress', { index: index + 1, total, name: name ?? '', ...noEscape }))
      )
    );
  };

  // Ctrl+V anywhere on the page, when the button cannot read the clipboard. Only the results of the bookmarklet are
  // taken, anything else is pasted as usual.
  useEffect(() => {
    if (source !== 'page') return;
    const onPaste = (event: ClipboardEvent) => {
      let results: IResultListType | undefined;
      try {
        results = ParsePastedResults(event.clipboardData?.getData('text'));
      } catch {
        results = undefined;
      }
      if (!results) return;
      event.preventDefault();
      onImport(async () => results!);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onImport, source]);

  const paste = useCallback(() => onImport(() => ReadPastedResults(t)), [onImport, t]);

  const importFile = (file: File) => {
    onImport(async () => ToExternalResultList(IofXmlToJson(await file.text())));
    // The file is read here, not uploaded
    return false;
  };

  return (
    <Row gutter={8} align="bottom">
      <Col span={4}>
        <FormItem label={t('results.ImportSource')}>
          <Select
            value={source}
            popupMatchSelectWidth={false}
            options={[
              { value: 'winsplits', label: 'WinSplits Online' },
              { value: 'page', label: t('results.ImportSourcePage') },
              { value: 'iofXmlFile', label: t('results.ImportSourceIofXmlFile') }
            ]}
            onChange={(value: ImportSource) => setSource(value)}
          />
        </FormItem>
      </Col>
      <Col span={9}>
        {source === 'winsplits' ? (
          <FormItem label={t('results.ImportLink')} tooltip={t('results.ImportWinSplitsTooltip')}>
            <Input
              allowClear
              value={link}
              placeholder="https://obasen.orientering.se/winsplits/online/sv/default.asp?page=classes&databaseId=116342"
              onChange={e => setLink(e.currentTarget.value)}
            />
          </FormItem>
        ) : source === 'page' ? (
          <FormItem label={t('results.ImportPageHow')} tooltip={t('results.ImportPageBookmarkTooltip')}>
            <Typography.Text>
              {t('results.SverigelistanBookmarkBefore')}{' '}
              {/* A link, to be dragged to the bookmarks bar. A click here would run it on this page. */}
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <a ref={bookmarkRef} style={{ cursor: 'grab' }} onClick={e => e.preventDefault()}>
                <CopyOutlined /> {bookmarkName}
              </a>{' '}
              {t('results.SverigelistanBookmarkAfter')}
            </Typography.Text>
          </FormItem>
        ) : (
          <FormItem label={t('results.ImportFile')} tooltip={t('results.ImportIofXmlFileTooltip')}>
            <Typography.Text type="secondary">{t('results.ImportIofXmlFileInfo')}</Typography.Text>
          </FormItem>
        )}
      </Col>
      <Col span={7}>
        <FormItem label={t('results.ImportClubNames')} tooltip={t('results.ImportClubNamesTooltip')}>
          <Input value={clubNames} onChange={e => onClubNamesChange(e.currentTarget.value)} />
        </FormItem>
      </Col>
      <Col span={4}>
        <FormItem label=" ">
          {source === 'winsplits' ? (
            <Button
              block
              type="primary"
              icon={<ImportOutlined />}
              loading={importing}
              disabled={!link.trim()}
              onClick={importLink}
            >
              {t('results.Import')}
            </Button>
          ) : source === 'page' ? (
            <Tooltip title={t('results.ImportPagePasteTooltip', { bookmark: bookmarkName, ...noEscape })}>
              <Button block type="primary" icon={<SnippetsOutlined />} loading={importing} onClick={paste}>
                {t('results.ImportPagePaste')}
              </Button>
            </Tooltip>
          ) : (
            <Upload accept=".xml,text/xml,application/xml" showUploadList={false} beforeUpload={importFile}>
              <Button block type="primary" icon={<UploadOutlined />} loading={importing}>
                {t('results.ImportChooseFile')}
              </Button>
            </Upload>
          )}
        </FormItem>
      </Col>
    </Row>
  );
};

export default ImportExternalResults;
