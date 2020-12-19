import React, { useState, useEffect } from 'react';
import { inject, observer } from 'mobx-react';
import MenuItem from '../MenuItem';
import { useTranslation } from 'react-i18next';
import EventSelectorWizardModal from '../../calendar/eventSelector/EventSelectorWizardModal';
import CalendarEdit from '../../calendar/item/CalendarEdit';
import { PostJsonData } from '../../../utils/api';
import { message } from 'antd';
import moment from 'moment';
import { dateFormat } from '../../../utils/formHelper';
import { useHistory } from 'react-router-dom';

const moduleName = 'Calendar';
const defaultCalendarObject = (userId) => ({
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
  responsibleUserId: userId,
  repeatingGid: undefined,
  repeatingModified: false,
});

const CalendarSubMenus = inject(
  'clubModel',
  'globalStateModel',
  'sessionModel'
)(
  observer((props) => {
    const { t } = useTranslation();
    const { clubModel, globalStateModel, sessionModel } = props;
    const moduleInfo = clubModel.module('Calendar');
    const resultsInfo = clubModel.module('Results');
    const [addCalendarModalIsOpen, setAddCalendarModalIsOpen] = useState(false);
    const [eventSelectorWizardModalIsOpen, setEventSelectorWizardModalIsOpen] = useState(false);
    const [domains, setDomains] = useState();
    const history = useHistory();

    useEffect(() => {
      const url = clubModel.modules.find((module) => module.name === 'Calendar').queryUrl;
      PostJsonData(
        url,
        {
          iType: 'DOMAINS',
        },
        true
      )
        .then((domainsJson) => {
          setDomains(domainsJson);
        })
        .catch((e) => {
          message.error(e.message);
        });
    }, []);

    return (
      <>
        {addCalendarModalIsOpen ? (
          <CalendarEdit
            title={t('calendar.Add')}
            calendarObject={defaultCalendarObject(parseInt(sessionModel.id))}
            open={addCalendarModalIsOpen}
            domains={domains}
            onClose={() => setAddCalendarModalIsOpen(false)}
          />
        ) : null}
        {eventSelectorWizardModalIsOpen ? (
          <EventSelectorWizardModal
            open={eventSelectorWizardModalIsOpen}
            onClose={() => setEventSelectorWizardModalIsOpen(false)}
          />
        ) : null}
        <MenuItem
          key={'menuItem#calendar'}
          icon={moduleName + 'Icon'}
          name={t('calendar.Calendar')}
          disabled={false}
          isSubMenu
          onClick={() => {
            globalStateModel.setDashboard(
              history,
              '/calendar',
              moment().startOf('month').format(dateFormat),
              moment().endOf('month').format(dateFormat),
              1
            );
          }}
        />
        <MenuItem
          key={'menuItem#calendarAdd'}
          icon="plus"
          name={t('calendar.Add')}
          disabled={!moduleInfo.addUrl || !sessionModel.loggedIn || !domains}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue('rightMenuVisible', false);
            setTimeout(() => setAddCalendarModalIsOpen(true), 0);
          }}
        />
        <MenuItem
          key={'menuItem#calendarEventSelector'}
          icon="star"
          name={t('calendar.EventSelector')}
          disabled={!moduleInfo.addUrl || !resultsInfo.queryUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue('rightMenuVisible', false);
            setTimeout(() => setEventSelectorWizardModalIsOpen(true), 0);
          }}
        />
      </>
    );
  })
);

export default CalendarSubMenus;
