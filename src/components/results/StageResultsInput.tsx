import { PlusOutlined, SnippetsOutlined } from '@ant-design/icons';
import { Button, Input, Space, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IResultListType } from '../../models/iof.xsd-3.0';
import { WinSplitsDatabaseId } from '../../utils/resultSources';
import { ReadPastedResults } from './ImportExternalResults';

/** A stage of an event of several days: its results, pasted (copied by the bookmarklet), or an event in WinSplits */
export interface IStageResults {
  key: number;
  label: string;
  results?: IResultListType;
  winSplitsDatabaseId?: number;
}

interface IStageResultsInputProps {
  value: IStageResults[];
  onChange: (stages: IStageResults[]) => void;
}

/** The stages in their order: each one pasted after the bookmark copied it, or a link to WinSplits Online */
const StageResultsInput = ({ value, onChange }: IStageResultsInputProps) => {
  const { t } = useTranslation();
  const [link, setLink] = useState('');
  const [error, setError] = useState<string>();
  const nextKey = () => Math.max(0, ...value.map(stage => stage.key)) + 1;

  const paste = () => {
    setError(undefined);
    ReadPastedResults(t).then(
      results => onChange([...value, { key: nextKey(), label: results.Event.Name ?? '?', results }]),
      reason => setError(reason instanceof Error ? reason.message : String(reason))
    );
  };

  const addLink = () => {
    setError(undefined);
    const databaseId = WinSplitsDatabaseId(link);
    if (!databaseId) {
      setError(t('results.ImportInvalidWinSplitsLink'));
      return;
    }
    onChange([...value, { key: nextKey(), label: `WinSplits ${databaseId}`, winSplitsDatabaseId: databaseId }]);
    setLink('');
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={4}>
      {value.length ? (
        <Space wrap size={4}>
          {value.map((stage, index) => (
            <Tag key={stage.key} closable onClose={() => onChange(value.filter(s => s.key !== stage.key))}>
              {index + 1}. {stage.label}
            </Tag>
          ))}
        </Space>
      ) : null}
      <Space.Compact style={{ width: '100%' }}>
        <Tooltip title={t('results.TotalStagePasteTooltip', { bookmark: t('results.ImportPageBookmark') })}>
          <Button icon={<SnippetsOutlined />} onClick={paste}>
            {t('results.TotalStagePaste')}
          </Button>
        </Tooltip>
        <Input
          allowClear
          value={link}
          placeholder={t('results.TotalStageWinSplitsPlaceholder')}
          onChange={e => setLink(e.currentTarget.value)}
          onPressEnter={addLink}
        />
        <Button icon={<PlusOutlined />} disabled={!link.trim()} onClick={addLink} />
      </Space.Compact>
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
    </Space>
  );
};

export default StageResultsInput;
