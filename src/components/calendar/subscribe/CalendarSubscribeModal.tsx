import { CopyOutlined } from '@ant-design/icons';
import { Form, InputNumber, message, Modal, Typography } from 'antd';
import copy from 'copy-to-clipboard';
import { observer } from 'mobx-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IOption } from '../../../utils/formHelper';
import { useMobxStore } from '../../../utils/mobxStore';
import { ICalendarDomains } from '../../../utils/responseCalendarInterfaces';
import { FormSelect } from '../../formItems/FormSelect';

// Kept in sync with the limits of php/calendar/ics.php, which clamps the parameters to them
export const MonthsBackMin = 0;
export const MonthsBackMax = 6;
export const MonthsBackDefault = 1;
export const MonthsForwardMin = 1;
export const MonthsForwardMax = 12;
export const MonthsForwardDefault = 3;
/** The type of the races and trainings selected for the club from Eventor, besides the types of the activities */
export const EventorRacesType = 'eventor';

export interface ICalendarIcsFilter {
  monthsBack: number;
  monthsForward: number;
  /** The activity types, and EventorRacesType, to include. None selected includes all */
  types: (number | string)[];
  /** The groups of the activities to include. None selected includes all */
  groupIds: (number | string)[];
}

/**
 * The link of the iCalendar feed, next to the query of the calendar (the folder differs between the clubs).
 */
export const getCalendarIcsUrl = (queryUrl: string, filter: ICalendarIcsFilter, name: string) => {
  const url = new URL('ics.php', queryUrl);
  url.searchParams.set('monthsBack', String(filter.monthsBack));
  url.searchParams.set('monthsForward', String(filter.monthsForward));
  if (filter.types.length) url.searchParams.set('types', filter.types.join(','));
  if (filter.groupIds.length) url.searchParams.set('groups', filter.groupIds.join(','));
  if (name) url.searchParams.set('name', name);
  return url.toString();
};

interface ICalendarSubscribeModalProps {
  open: boolean;
  domains: ICalendarDomains;
  onClose: () => void;
}

/**
 * Lets the user choose how many months back and forward the subscribed calendar holds, and which types and groups,
 * and copies the link of the iCalendar feed to subscribe to in Google, Outlook or Apple calendars.
 */
const CalendarSubscribeModal = observer(({ open, domains, onClose }: ICalendarSubscribeModalProps) => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const [monthsBack, setMonthsBack] = useState(MonthsBackDefault);
  const [monthsForward, setMonthsForward] = useState(MonthsForwardDefault);
  const [types, setTypes] = useState<(number | string)[]>([]);
  const [groupIds, setGroupIds] = useState<(number | string)[]>([]);
  const queryUrl = clubModel.modules.find(module => module.name === 'Calendar')?.queryUrl;
  const typeOptions = useMemo<IOption[]>(
    () => [...domains.activityTypes, { code: EventorRacesType, description: t('calendar.SubscribeEventorRaces') }],
    [domains.activityTypes, t]
  );
  // The group "[Alla]" (code 0) is the same as no filter on the group
  const groupOptions = useMemo(() => domains.groups.filter(group => group.code !== 0), [domains.groups]);

  const onCopy = () => {
    if (!queryUrl) return;
    const url = getCalendarIcsUrl(queryUrl, { monthsBack, monthsForward, types, groupIds }, clubModel.title);
    if (!copy(url)) {
      message.error(`${t('calendar.SubscribeCopyFailed')}: ${url}`, 15);
      return;
    }
    message.success(`${t('calendar.SubscribeCopied')}: ${url}`, 10);
    onClose();
  };

  return (
    <Modal
      title={t('calendar.Subscribe')}
      open={open}
      okText={t('calendar.SubscribeCopy')}
      okButtonProps={{ icon: <CopyOutlined />, disabled: !queryUrl }}
      cancelText={t('common.Cancel')}
      onOk={onCopy}
      onCancel={onClose}
    >
      <Typography.Paragraph>{t('calendar.SubscribeDescription')}</Typography.Paragraph>
      <Form layout="vertical">
        <Form.Item label={t('calendar.SubscribeMonthsBack')}>
          <InputNumber
            min={MonthsBackMin}
            max={MonthsBackMax}
            precision={0}
            value={monthsBack}
            onChange={value => setMonthsBack(value ?? MonthsBackDefault)}
          />
        </Form.Item>
        <Form.Item label={t('calendar.SubscribeMonthsForward')}>
          <InputNumber
            min={MonthsForwardMin}
            max={MonthsForwardMax}
            precision={0}
            value={monthsForward}
            onChange={value => setMonthsForward(value ?? MonthsForwardDefault)}
          />
        </Form.Item>
        <Form.Item label={t('calendar.ActivityType')} extra={t('calendar.SubscribeNoFilterAll')}>
          <FormSelect
            allowClear
            mode="multiple"
            placeholder={t('calendar.SubscribeAll')}
            options={typeOptions}
            value={types}
            onChange={setTypes}
          />
        </Form.Item>
        <Form.Item label={t('calendar.Group')} extra={t('calendar.SubscribeGroupHint')}>
          <FormSelect
            allowClear
            mode="multiple"
            placeholder={t('calendar.SubscribeAll')}
            options={groupOptions}
            value={groupIds}
            onChange={setGroupIds}
          />
        </Form.Item>
      </Form>
      <Typography.Text type="secondary">{t('calendar.SubscribeHint')}</Typography.Text>
    </Modal>
  );
});

export default CalendarSubscribeModal;
