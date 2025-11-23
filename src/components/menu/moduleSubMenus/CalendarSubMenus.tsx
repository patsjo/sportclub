import { message } from 'antd';
import { MaterialIconsType } from '../../materialIcon/MaterialIcon';
import { observer } from 'mobx-react';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMobxStore } from '../../../utils/mobxStore';
import { ICalendarActivity, ICalendarDomains } from '../../../utils/responseCalendarInterfaces';
import { PostJsonData } from '../../../utils/api';
import { dateFormat } from '../../../utils/formHelper';
import CalendarEdit from '../../calendar/item/CalendarEdit';
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
  latitude: null,
});

const CalendarSubMenus = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const calendarModule = React.useMemo(() => clubModel.modules.find((module) => module.name === 'Calendar'), []);
  const resultsModule = React.useMemo(() => clubModel.modules.find((module) => module.name === 'Results'), []);
  const [addCalendarModalIsOpen, setAddCalendarModalIsOpen] = useState(false);
  const [domains, setDomains] = useState<ICalendarDomains>();
  const navigate = useNavigate();

  useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Calendar')?.queryUrl;
    if (!url) return;

    PostJsonData(
      url,
      {
        iType: 'DOMAINS',
      },
      true,
    )
      .then((domainsJson: ICalendarDomains) => {
        setDomains(domainsJson);
      })
      .catch((e) => {
        message.error(e.message);
      });
  }, []);

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
        icon={(moduleName + 'Icon') as MaterialIconsType}
        name={t('calendar.Calendar')}
        disabled={false}
        isSubMenu
        onClick={() => {
          globalStateModel.setDashboard(
            navigate,
            '/calendar',
            dayjs().startOf('month').format(dateFormat),
            dayjs().endOf('month').format(dateFormat),
            1,
          );
        }}
      />
      <MenuItem
        key={'menuItem#calendarAdd'}
        icon="plus"
        name={t('calendar.Add')}
        disabled={!calendarModule?.addUrl || !sessionModel.loggedIn || !domains}
        isSubMenu
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          setTimeout(() => setAddCalendarModalIsOpen(true), 0);
        }}
      />
      <MenuItem
        key={'menuItem#calendarEventSelector'}
        icon="star"
        name={t('calendar.EventSelector')}
        disabled={
          !calendarModule?.addUrl || !resultsModule?.queryUrl || !sessionModel.loggedIn || !sessionModel.isAdmin
        }
        isSubMenu
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/calendar/eventselector');
        }}
      />
    </>
  );
});

export default CalendarSubMenus;
