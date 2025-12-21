import { observer } from 'mobx-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { PostJsonData } from '../../../utils/api';
import { useMobxStore } from '../../../utils/mobxStore';
import { ICalendarActivity, ICalendarDomains } from '../../../utils/responseCalendarInterfaces';
import FadeOutItem from '../../fadeOutItem/FadeOutItem';
import CalendarEdit from './CalendarEdit';

const ContentHolder = styled.div``;

const CalendarTime = styled.div`
  font-size: 10px;
  font-weight: normal;
  text-align: left;
  text-color: #606060;
`;

const CalendarHeader = styled.div`
  font-size: 18px;
  font-weight: bolder;
  text-align: left;
`;

const CalendarText = styled.div`
  font-size: 13px;
  font-weight: normal;
  text-align: justify;
  text-justify: inter-word;
  white-space: pre-line;
`;
const CalendarReadMore = styled.div`
  font-size: 14px;
  font-weight: bold;
  text-align: left;
  cursor: pointer;
`;
const CalendarBy = styled.div`
  font-size: 10px;
  font-weight: normal;
  text-align: right;
  text-color: #606060;
`;
const Activity = styled.div`
  font-size: 12px;
  line-height: 1.5em;
  padding-top: 2px;
  padding-bottom: 2px;
`;

interface ICalendarItemProps {
  calendarObject: ICalendarActivity;
  domains: ICalendarDomains;
  children?: React.ReactNode;
}
const CalendarItem = observer(({ calendarObject, domains, children }: ICalendarItemProps) => {
  const { clubModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const calendarModule = React.useMemo(
    () => clubModel.modules.find(module => module.name === 'Calendar'),
    [clubModel.modules]
  );

  return calendarModule ? (
    <FadeOutItem
      paddingBottom={0}
      module={calendarModule}
      content={
        <Activity key={`activity#${calendarObject.activityId}`}>
          {calendarObject.time ? `${calendarObject.time}, ` : ''}
          {calendarObject.header}
          {calendarObject.place ? `, ${calendarObject.place}` : ''}
          {children}
        </Activity>
      }
      modalContent={
        <ContentHolder>
          <CalendarHeader>{calendarObject.header}</CalendarHeader>
          <CalendarTime>
            {calendarObject.date}
            {calendarObject.time ? `, ${calendarObject.time}` : ''}
          </CalendarTime>
          <CalendarText>{`${t('calendar.ActivityType')}: ${
            domains.activityTypes.find(activityType => activityType.code === calendarObject.activityTypeId)?.description
          }`}</CalendarText>
          <CalendarText>{`${t('calendar.Group')}: ${
            domains.groups.find(group => group.code === calendarObject.groupId)?.description
          }`}</CalendarText>
          {calendarObject.place ? (
            <CalendarText>{`${t('calendar.Place')}: ${calendarObject.place}`}</CalendarText>
          ) : null}
          <CalendarText>
            {calendarObject.description}
            {children}
            {calendarObject.url ? (
              <CalendarReadMore>
                <a href={calendarObject.url} target="_blank" rel="noopener noreferrer">
                  Läs mer...
                </a>
              </CalendarReadMore>
            ) : null}
          </CalendarText>
          <CalendarBy>
            {domains.users.find(user => user.code === calendarObject.responsibleUserId)?.description}
          </CalendarBy>
        </ContentHolder>
      }
      modalColumns={3}
      editFormContent={
        sessionModel.isAdmin || calendarObject.responsibleUserId?.toString() === sessionModel.id ? (
          <CalendarEdit title={t('calendar.Edit')} calendarObject={calendarObject} domains={domains} />
        ) : undefined
      }
      deletePromise={
        sessionModel.isAdmin || calendarObject.responsibleUserId?.toString() === sessionModel.id
          ? () =>
              PostJsonData(
                calendarModule?.deleteUrl,
                {
                  iActivityID: calendarObject.activityId,
                  username: sessionModel.username,
                  password: sessionModel.password
                },
                true,
                sessionModel.authorizationHeader
              )
          : undefined
      }
      deleteAllPromise={
        (sessionModel.isAdmin || calendarObject.responsibleUserId?.toString() === sessionModel.id) &&
        calendarObject.repeatingGid != null
          ? () =>
              PostJsonData(
                calendarModule?.deleteUrl,
                {
                  iActivityID: calendarObject.activityId,
                  iRepeatingGid: calendarObject.repeatingGid,
                  username: sessionModel.username,
                  password: sessionModel.password
                },
                true,
                sessionModel.authorizationHeader
              )
          : undefined
      }
    />
  ) : null;
});

export default CalendarItem;
