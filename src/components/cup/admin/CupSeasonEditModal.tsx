import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import {
  cupPointSystemTypes,
  ICupCategory,
  ICupSeasonProps,
  ICupSeasonSettings,
  normalizeSeasonSettings,
  presetCategories
} from '../../../models/cupModel';
import { calculateCupPoints, compareCupClasses, cupClassKey } from '../../../utils/cupHelper';
import { dateFormat } from '../../../utils/formHelper';
import { showCupError, useCupApi } from '../useCup';

interface ICupSeasonEditModalProps {
  cupId: number;
  season?: ICupSeasonProps;
  /** The classes that have results in the season, to put in order */
  classNames?: string[];
  open: boolean;
  onClose: () => void;
  onSaved: (seasonId: number) => void;
}

const parsePositionPoints = (value: string) =>
  value
    .split(/[,;\s]+/)
    .map(v => parseFloat(v.replace(',', '.')))
    .filter(v => !isNaN(v));

const CupSeasonEditModal = ({ cupId, season, classNames = [], open, onClose, onSaved }: ICupSeasonEditModalProps) => {
  const { t } = useTranslation();
  const { save } = useCupApi();
  const [saving, setSaving] = useState(false);
  const year = dayjs().year();
  const [name, setName] = useState(season?.name ?? String(year));
  const [dates, setDates] = useState<[string, string]>([
    season?.startDate ?? `${year}-01-01`,
    season?.endDate ?? `${year}-12-31`
  ]);
  const [settings, setSettings] = useState<ICupSeasonSettings>(() => normalizeSeasonSettings(season?.settings));
  const [positionPointsText, setPositionPointsText] = useState(() => settings.pointSystem.positionPoints.join(', '));

  const [newClass, setNewClass] = useState('');

  /** The chosen order first, then the other known classes in the default order */
  const orderedClasses = useMemo(() => {
    const chosen = settings.classOrder.filter(c => c.trim());
    const chosenKeys = new Set(chosen.map(cupClassKey));
    const others: string[] = [];
    classNames.forEach(c => {
      const key = cupClassKey(c);
      if (c.trim() && !chosenKeys.has(key) && !others.some(o => cupClassKey(o) === key)) others.push(c.trim());
    });
    others.sort(compareCupClasses([]));
    return [...chosen, ...others];
  }, [classNames, settings.classOrder]);
  const moveClass = (index: number, to: number) => {
    const list = [...orderedClasses];
    const [moved] = list.splice(index, 1);
    list.splice(Math.max(0, Math.min(list.length, to)), 0, moved);
    setSettings(s => ({ ...s, classOrder: list }));
  };
  const addClass = () => {
    const name = newClass.trim();
    if (name && !orderedClasses.some(c => cupClassKey(c) === cupClassKey(name))) {
      setSettings(s => ({ ...s, classOrder: [...orderedClasses, name] }));
    }
    setNewClass('');
  };

  const ps = settings.pointSystem;
  const setPointSystem = (values: Partial<ICupSeasonSettings['pointSystem']>) =>
    setSettings(s => ({ ...s, pointSystem: { ...s.pointSystem, ...values } }));
  const setCategory = (id: string, values: Partial<ICupCategory>) =>
    setSettings(s => ({ ...s, categories: s.categories.map(c => (c.id === id ? { ...c, ...values } : c)) }));
  const addCategory = (category: ICupCategory) =>
    setSettings(s => ({
      ...s,
      categories: [
        ...s.categories,
        { ...category, id: s.categories.some(c => c.id === category.id) ? uuidv4() : category.id }
      ]
    }));

  /** Points for the first positions with 20 starters, 1 minute between every position */
  const preview = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) =>
        calculateCupPoints(
          {
            status: 'OK',
            scoredPosition: i + 1,
            scoredNofStarts: 20,
            scoredTimeBehindSeconds: i * 60,
            timeSeconds: 1800 + i * 60
          },
          ps
        )
      ),
    [ps]
  );

  const valid =
    name.trim().length > 0 && dates[0] && dates[1] && dates[0] <= dates[1] && settings.categories.length > 0;
  const racesOutside = (season?.races ?? []).filter(r => r.raceDate < dates[0] || r.raceDate > dates[1]);

  const onOk = async () => {
    try {
      setSaving(true);
      const response = await save<{ seasonId: number }>({
        iType: 'SEASON',
        iSeasonId: season?.seasonId ?? -1,
        iCupId: cupId,
        iName: name.trim(),
        iStartDate: dates[0],
        iEndDate: dates[1],
        iSettings: {
          ...settings,
          pointsBasis: settings.participants === 'CLUB' ? settings.pointsBasis : 'ALL',
          categories: settings.categories.map(c => ({ ...c, classes: c.classes.filter(cls => cls.trim()) }))
        }
      });
      setSaving(false);
      if (response?.seasonId) onSaved(response.seasonId);
    } catch (e) {
      setSaving(false);
      showCupError(e);
    }
  };

  const usesWinnerPoints = ['WINNER_FIXED', 'RUN_TO_1000', 'TIME_BEHIND', 'PERCENT_OF_WINNER'].includes(ps.type);

  return (
    <Modal
      title={season ? t('cup.EditSeason') : t('cup.NewSeason')}
      open={open}
      width={860}
      okText={t('common.Save')}
      cancelText={t('common.Cancel')}
      okButtonProps={{ loading: saving, disabled: !valid || racesOutside.length > 0 }}
      maskClosable={false}
      style={{ top: 30 }}
      onOk={onOk}
      onCancel={onClose}
    >
      <Form layout="vertical">
        <Space wrap size="large">
          <Form.Item required label={t('cup.SeasonName')}>
            <Input value={name} maxLength={64} style={{ width: 200 }} onChange={e => setName(e.target.value)} />
          </Form.Item>
          <Form.Item required label={t('cup.SeasonDates')} extra={t('cup.SeasonDatesInfo')}>
            <DatePicker.RangePicker
              format={dateFormat}
              allowClear={false}
              value={dates[0] && dates[1] ? [dayjs(dates[0]), dayjs(dates[1])] : null}
              onChange={values =>
                values?.[0] && values?.[1] && setDates([values[0].format(dateFormat), values[1].format(dateFormat)])
              }
            />
          </Form.Item>
        </Space>
        {racesOutside.length > 0 ? (
          <Alert
            showIcon
            type="error"
            title={t('cup.RacesOutsideSeason', {
              races: racesOutside.map(r => `${r.name} (${r.raceDate})`).join(', ')
            })}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Divider titlePlacement="start">{t('cup.Participants')}</Divider>
        <Form.Item>
          <Radio.Group
            value={settings.participants}
            options={[
              { value: 'CLUB', label: t('cup.ParticipantsCLUB') },
              { value: 'ALL', label: t('cup.ParticipantsALL') }
            ]}
            onChange={e => setSettings(s => ({ ...s, participants: e.target.value }))}
          />
        </Form.Item>
        {settings.participants === 'CLUB' ? (
          <Form.Item label={t('cup.PointsBasis')}>
            <Radio.Group
              value={settings.pointsBasis}
              options={[
                { value: 'ALL', label: t('cup.PointsBasisALL') },
                { value: 'CLUB', label: t('cup.PointsBasisCLUB') }
              ]}
              onChange={e => setSettings(s => ({ ...s, pointsBasis: e.target.value }))}
            />
          </Form.Item>
        ) : null}

        <Divider titlePlacement="start">{t('cup.PointSystem')}</Divider>
        <Form.Item label={t('cup.PointSystemType')} extra={t(`cup.PointSystem${ps.type}Info`)}>
          <Select
            value={ps.type}
            options={cupPointSystemTypes.map(type => ({ value: type, label: t(`cup.PointSystem${type}`) }))}
            onChange={type => setPointSystem({ type })}
          />
        </Form.Item>
        <Space wrap size="middle">
          {ps.type === 'POSITION_TABLE' ? (
            <Form.Item label={t('cup.PositionPoints')} extra={t('cup.PositionPointsInfo')} style={{ minWidth: 380 }}>
              <Input
                value={positionPointsText}
                onChange={e => {
                  setPositionPointsText(e.target.value);
                  setPointSystem({ positionPoints: parsePositionPoints(e.target.value) });
                }}
              />
            </Form.Item>
          ) : null}
          {usesWinnerPoints ? (
            <Form.Item label={t('cup.WinnerPoints')}>
              <InputNumber min={0} value={ps.winnerPoints} onChange={v => setPointSystem({ winnerPoints: v ?? 0 })} />
            </Form.Item>
          ) : null}
          {ps.type === 'WINNER_FIXED' ? (
            <Form.Item label={t('cup.DecreasePerPosition')}>
              <InputNumber
                min={0}
                value={ps.decreasePerPosition}
                onChange={v => setPointSystem({ decreasePerPosition: v ?? 0 })}
              />
            </Form.Item>
          ) : null}
          {ps.type === 'TIME_BEHIND' ? (
            <Form.Item label={t('cup.DecreasePerMinute')}>
              <InputNumber
                min={0}
                step={0.5}
                value={ps.decreasePerMinute}
                onChange={v => setPointSystem({ decreasePerMinute: v ?? 0 })}
              />
            </Form.Item>
          ) : null}
          <Form.Item label={t('cup.MinPoints')} extra={t('cup.MinPointsInfo')}>
            <InputNumber min={0} value={ps.minPoints} onChange={v => setPointSystem({ minPoints: v ?? 0 })} />
          </Form.Item>
          <Form.Item label={t('cup.NotFinishedPoints')}>
            <InputNumber
              min={0}
              value={ps.notFinishedPoints}
              onChange={v => setPointSystem({ notFinishedPoints: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label={t('cup.Decimals')}>
            <InputNumber min={0} max={2} value={ps.decimals} onChange={v => setPointSystem({ decimals: v ?? 0 })} />
          </Form.Item>
        </Space>
        <Alert
          showIcon
          type="info"
          title={t('cup.PointsPreview')}
          description={preview.map((p, i) => `${i + 1}. ${p}p`).join('   ')}
          style={{ marginBottom: 16 }}
        />

        <Divider titlePlacement="start">{t('cup.CountingRules')}</Divider>
        <Space wrap size="large">
          <Form.Item label={t('cup.MaxRacesCounted')} extra={t('cup.MaxRacesCountedInfo')}>
            <InputNumber
              min={1}
              value={settings.maxRacesCounted}
              placeholder={t('common.All')}
              onChange={v => setSettings(s => ({ ...s, maxRacesCounted: v ?? null }))}
            />
          </Form.Item>
          <Form.Item label={t('cup.BonusPointsPerExtraRace')} extra={t('cup.BonusPointsPerExtraRaceInfo')}>
            <InputNumber
              min={0}
              disabled={settings.maxRacesCounted == null}
              value={settings.bonusPointsPerExtraRace}
              onChange={v => setSettings(s => ({ ...s, bonusPointsPerExtraRace: v ?? 0 }))}
            />
          </Form.Item>
        </Space>

        <Divider titlePlacement="start">{t('cup.Categories')}</Divider>
        <Typography.Paragraph type="secondary">{t('cup.CategoriesInfo')}</Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          {t('cup.AgeInfo', { year: dates[0]?.substring(0, 4) })}
        </Typography.Paragraph>
        <Space direction="vertical" style={{ width: '100%' }}>
          {settings.categories.map(category => (
            <Card key={category.id} size="small">
              <Space wrap align="start">
                <Input
                  value={category.name}
                  style={{ width: 170 }}
                  placeholder={t('cup.Name')}
                  onChange={e => setCategory(category.id, { name: e.target.value })}
                />
                <Select
                  mode="tags"
                  value={category.classes}
                  style={{ minWidth: 360 }}
                  placeholder={t('cup.ClassPatterns')}
                  tokenSeparators={[',', ' ']}
                  onChange={(classes: string[]) => setCategory(category.id, { classes })}
                />
                <Space size={4}>
                  <InputNumber
                    min={0}
                    max={120}
                    value={category.minAge ?? null}
                    placeholder={t('cup.AgeFrom')}
                    style={{ width: 92 }}
                    onChange={v => setCategory(category.id, { minAge: v ?? null })}
                  />
                  <span>–</span>
                  <InputNumber
                    min={0}
                    max={120}
                    value={category.maxAge ?? null}
                    placeholder={t('cup.AgeTo')}
                    style={{ width: 92 }}
                    onChange={v => setCategory(category.id, { maxAge: v ?? null })}
                  />
                  <span>{t('cup.Years')}</span>
                </Space>
                <span>
                  <Switch
                    checked={category.groupByClass}
                    onChange={groupByClass => setCategory(category.id, { groupByClass })}
                  />{' '}
                  {t('cup.GroupByClass')}
                </span>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={settings.categories.length <= 1}
                  onClick={() =>
                    setSettings(s => ({ ...s, categories: s.categories.filter(c => c.id !== category.id) }))
                  }
                />
              </Space>
            </Card>
          ))}
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={() => addCategory(presetCategories.all())}>
              {t('cup.CategoryAll')}
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCategory(presetCategories.youth())}>
              {t('cup.CategoryYouth')}
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCategory(presetCategories.beginners())}>
              {t('cup.CategoryBeginners')}
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => addCategory({ id: uuidv4(), name: t('cup.NewCategory'), classes: [], groupByClass: true })}
            >
              {t('cup.CategoryCustom')}
            </Button>
          </Space>
        </Space>

        <Divider titlePlacement="start">{t('cup.ClassOrder')}</Divider>
        <Typography.Paragraph type="secondary">{t('cup.ClassOrderInfo')}</Typography.Paragraph>
        <List
          bordered
          size="small"
          dataSource={orderedClasses}
          locale={{ emptyText: t('cup.ClassOrderEmpty') }}
          style={{ maxWidth: 420, marginBottom: 12 }}
          renderItem={(className, index) => (
            <List.Item
              actions={[
                <Button
                  key="top"
                  size="small"
                  type="text"
                  icon={<VerticalAlignTopOutlined />}
                  title={t('cup.MoveFirst')}
                  disabled={index === 0}
                  onClick={() => moveClass(index, 0)}
                />,
                <Button
                  key="up"
                  size="small"
                  type="text"
                  icon={<ArrowUpOutlined />}
                  title={t('cup.MoveUp')}
                  disabled={index === 0}
                  onClick={() => moveClass(index, index - 1)}
                />,
                <Button
                  key="down"
                  size="small"
                  type="text"
                  icon={<ArrowDownOutlined />}
                  title={t('cup.MoveDown')}
                  disabled={index === orderedClasses.length - 1}
                  onClick={() => moveClass(index, index + 1)}
                />
              ]}
            >
              <span>
                <Typography.Text type="secondary" style={{ display: 'inline-block', width: 28 }}>
                  {index + 1}.
                </Typography.Text>
                {className}
              </span>
            </List.Item>
          )}
        />
        <Space wrap>
          <Input
            value={newClass}
            placeholder={t('cup.AddClass')}
            style={{ width: 200 }}
            onChange={e => setNewClass(e.target.value)}
            onPressEnter={addClass}
          />
          <Button icon={<PlusOutlined />} disabled={!newClass.trim()} onClick={addClass}>
            {t('cup.AddClass')}
          </Button>
          <Button
            disabled={settings.classOrder.length === 0}
            onClick={() => setSettings(s => ({ ...s, classOrder: [] }))}
          >
            {t('cup.ClassOrderReset')}
          </Button>
        </Space>
      </Form>
    </Modal>
  );
};

export default CupSeasonEditModal;
