import { message } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PostJsonData } from '../../../utils/api';
import { dateFormat } from '../../../utils/formHelper';
import { useMobxStore } from '../../../utils/mobxStore';
import { ICalendarActivity, ICalendarDomains } from '../../../utils/responseCalendarInterfaces';
import CalendarEdit from '../../calendar/item/CalendarEdit';
import { MaterialIconsType } from '../../materialIcon/MaterialIcon';
import MenuItem from '../MenuItem';

const moduleName = 'Calendar';
const defaultCalendarObject = (userId: string | undefined): ICalendarActivity => ({
  activityId: 0,
  activityTypeId: undefined,
  groupId: 0,
  date: new Date(new Date().getTime()).toISOString().substr(0, 10),
  time: undefined,
  activityDurationMinutes: null,
  place: '',
  header: '',
  description: '',
  url: '',
  responsibleUserId: userId ? parseInt(userId) : undefined,
  repeatingGid: null,
  repeatingModified: false,
  longitude: null,
  latitude: null
});

const CalendarSubMenus = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const calendarModule = React.useMemo(
    () => clubModel.modules.find(module => module.name === 'Calendar'),
    [clubModel.modules]
  );
  const resultsModule = React.useMemo(
    () => clubModel.modules.find(module => module.name === 'Results'),
    [clubModel.modules]
  );
  const [addCalendarModalIsOpen, setAddCalendarModalIsOpen] = useState(false);
  const [domains, setDomains] = useState<ICalendarDomains>();
  const navigate = useNavigate();

  useEffect(() => {
    const url = clubModel.modules.find(module => module.name === 'Calendar')?.queryUrl;
    if (!url) return;

    PostJsonData<ICalendarDomains>(
      url,
      {
        iType: 'DOMAINS'
      },
      true
    )
      .then(domainsJson => {
        setDomains(domainsJson);
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
      });
  }, [clubModel.modules]);

  return (
    <>
      {addCalendarModalIsOpen && domains ? (
        <CalendarEdit
          title={t('calendar.Add')}
          calendarObject={defaultCalendarObject(sessionModel.id)}
          open={addCalendarModalIsOpen}
          domains={domains}
          onClose={() => setAddCalendarModalIsOpen(false)}
        />
      ) : null}
      <MenuItem
        key={'menuItem#calendar'}
        isSubMenu
        icon={(moduleName + 'Icon') as MaterialIconsType}
        name={t('calendar.Calendar')}
        disabled={false}
        onClick={() => {
          globalStateModel.setDashboard(
            navigate,
            '/calendar',
            dayjs().startOf('month').format(dateFormat),
            dayjs().endOf('month').format(dateFormat),
            1
          );
        }}
      />
      <MenuItem
        key={'menuItem#calendarAdd'}
        isSubMenu
        icon="plus"
        name={t('calendar.Add')}
        disabled={!calendarModule?.addUrl || !sessionModel.loggedIn || !domains}
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          setTimeout(() => setAddCalendarModalIsOpen(true), 0);
        }}
      />
      <MenuItem
        key={'menuItem#calendarEventSelector'}
        isSubMenu
        icon="star"
        name={t('calendar.EventSelector')}
        disabled={
          !calendarModule?.addUrl || !resultsModule?.queryUrl || !sessionModel.loggedIn || !sessionModel.isAdmin
        }
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/calendar/eventselector');
        }}
      />
    </>
  );
});

export default CalendarSubMenus;
