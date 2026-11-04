import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cupThemes, CupThemeType, ICupRaceProps, ICupSeasonProps } from '../../../models/cupModel';
import { dateFormat } from '../../../utils/formHelper';
import { showCupError, useCupApi } from '../useCup';
import { useCupEventorImport } from '../useCupEventorImport';

interface IRaceForm {
  name: string;
  raceDate: dayjs.Dayjs;
  eventorId: number | null;
  eventorRaceId: number | null;
  useTotalResult: boolean;
  theme: CupThemeType | 'CUP';
}

interface ICupRaceEditModalProps {
  season: ICupSeasonProps;
  race?: ICupRaceProps;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Add a race manually, or edit a race */
const CupRaceEditModal = ({ season, race, open, onClose, onSaved }: ICupRaceEditModalProps) => {
  const { t } = useTranslation();
  const { save } = useCupApi();
  const importFromEventor = useCupEventorImport();
  const [form] = Form.useForm<IRaceForm>();
  const [saving, setSaving] = useState(false);

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const saved = await save<{ cupRaceId: number }[]>({
        iType: 'RACES',
        iSeasonId: season.seasonId,
        iRaces: [
          {
            iCupRaceId: race?.cupRaceId ?? -1,
            iName: values.name,
            iRaceDate: values.raceDate.format(dateFormat),
            iEventorId: values.eventorId,
            iEventorRaceId: values.eventorRaceId,
            iUseTotalResult: values.useTotalResult,
            iTheme: values.theme === 'CUP' ? null : values.theme
          }
        ]
      });
      // All participants: the participants from other clubs only come from Eventor, also for imported races
      if (season.settings.participants === 'ALL' && Array.isArray(saved) && saved.length && values.eventorId) {
        await importFromEventor([
          {
            cupRaceId: saved[0].cupRaceId,
            eventorId: values.eventorId,
            eventorRaceId: values.eventorRaceId,
            useTotalResult: values.useTotalResult,
            raceDate: values.raceDate.format(dateFormat),
            categories: season.settings.categories,
            seasonYear: parseInt(season.startDate.substring(0, 4), 10)
          }
        ]);
      }
      setSaving(false);
      onSaved();
    } catch (e) {
      setSaving(false);
      showCupError(e);
    }
  };

  return (
    <Modal
      destroyOnHidden
      title={race ? t('cup.EditRace') : t('cup.AddManualRace')}
      open={open}
      okText={t('common.Save')}
      cancelText={t('common.Cancel')}
      okButtonProps={{ loading: saving }}
      maskClosable={false}
      onOk={onOk}
      onCancel={onClose}
    >
      <Form<IRaceForm>
        form={form}
        layout="vertical"
        initialValues={{
          name: race?.name ?? '',
          raceDate: race
            ? dayjs(race.raceDate)
            : dayjs().isBefore(season.startDate)
              ? dayjs(season.startDate)
              : undefined,
          eventorId: race?.eventorId ?? null,
          eventorRaceId: race?.eventorRaceId ?? null,
          useTotalResult: race?.useTotalResult ?? false,
          theme: race?.theme ?? 'CUP'
        }}
      >
        <Form.Item name="name" label={t('cup.RaceName')} rules={[{ required: true, max: 128 }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="raceDate"
          label={t('cup.RaceDate')}
          extra={`${t('cup.SeasonDates')}: ${season.startDate} - ${season.endDate}`}
          rules={[{ required: true }]}
        >
          <DatePicker
            format={dateFormat}
            disabledDate={d => d.format(dateFormat) < season.startDate || d.format(dateFormat) > season.endDate}
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="eventorId" label={t('cup.EventorId')} extra={t('cup.EventorIdInfo')}>
            <InputNumber min={1} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="eventorRaceId" label={t('cup.EventorRaceId')}>
            <InputNumber min={1} style={{ width: 140 }} />
          </Form.Item>
        </div>
        <Form.Item
          name="useTotalResult"
          label={t('cup.UseTotalResult')}
          extra={t('cup.UseTotalResultInfo')}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item name="theme" label={t('cup.RaceTheme')}>
          <Select
            options={[
              { value: 'CUP', label: t('cup.SameThemeAsCup') },
              ...cupThemes.map(themeType => ({ value: themeType, label: t(`cup.Theme${themeType}`) }))
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CupRaceEditModal;
