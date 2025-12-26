import { message } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PostJsonData } from '../../../utils/api';
import { dateFormat } from '../../../utils/formHelper';
import { useMobxStore } from '../../../utils/mobxStore';
import { ICalendarActivity, ICalendarDomains } from '../../../utils/responseCalendarInterfaces';
import CalendarEdit from '../../calendar/item/CalendarEdit';
import { MaterialIconsType } from '../../materialIcon/MaterialIcon';
import { getMenuItem } from '../MenuItem';

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

export const useCalendarSubMenus = () => {
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

  return {
    addCalendarModal:
      addCalendarModalIsOpen && domains ? (
        <CalendarEdit
          title={t('calendar.Add')}
          calendarObject={defaultCalendarObject(sessionModel.id)}
          open={addCalendarModalIsOpen}
          domains={domains}
          onClose={() => setAddCalendarModalIsOpen(false)}
        />
      ) : null,
    calendarMenuItems: [
      getMenuItem(
        'menuItem#calendar',
        (moduleName + 'Icon') as MaterialIconsType,
        t('calendar.Calendar'),
        () => {
          globalStateModel.setDashboard(
            navigate,
            '/calendar',
            dayjs().startOf('month').format(dateFormat),
            dayjs().endOf('month').format(dateFormat),
            1
          );
        },
        true
      ),
      getMenuItem(
        'menuItem#calendarAdd',
        'plus',
        t('calendar.Add'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          setTimeout(() => setAddCalendarModalIsOpen(true), 0);
        },
        true,
        1,
        !calendarModule?.addUrl || !sessionModel.loggedIn || !domains
      ),
      getMenuItem(
        'menuItem#calendarEventSelector',
        'star',
        t('calendar.EventSelector'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/calendar/eventselector');
        },
        true,
        1,
        !calendarModule?.addUrl || !resultsModule?.queryUrl || !sessionModel.loggedIn || !sessionModel.isAdmin
      )
    ]
  };
};
