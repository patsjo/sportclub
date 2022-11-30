import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Col, message, Row, Skeleton } from 'antd';
import { observer } from 'mobx-react';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { ICalendarActivity, ICalendarDomains, ICalendarEvent } from 'utils/responseCalendarInterfaces';
import { PostJsonData } from '../../../utils/api';
import { dateFormat } from '../../../utils/formHelper';
import { GetDates, GetMonthName } from '../calendarHelper';
import CalendarItem from '../item/CalendarItem';

const dayNotInMonthColor = '#D0D0D0';

const MonthlyContainer = styled.div`
  & {
    margin-left: 40px;
    margin-right: 40px;
    display: block;
  }
  @media screen and (max-width: 999px) {
    display: none !important;
  }
`;

const MonthlyHeader = styled.div`
  background-color: white;
  border-bottom: 1px solid #d0d0d0;
  color: black;
  font-size: 24px;
  padding-bottom: 2px;
`;

const MonthlyDayRow = styled(Row)`
  background-color: white;
  border-left: 1px solid #d0d0d0;
  border-bottom: 1px solid #d0d0d0;
  color: black;
  font-size: 14px;
`;

const HeaderContainerCol = styled(Col)`
  background-color: white;
  border-right: 1px solid #d0d0d0;
  color: black;
  font-size: 14px;
  height: 24px;
`;

const WeekCol = styled(Col)`
  background-color: white;
  border-right: 1px solid #d0d0d0;
  color: black;
  font-size: 18px;
  min-height: 80px;
  text-align: center;
  overflow-y: hidden;
`;

const WeekColText = styled.p`
  margin: 0;
  position: absolute;
  min-width: 80px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
  -webkit-transform: translate(-50%, -50%) rotate(-90deg);
  -moz-transform: translate(-50%, -50%) rotate(-90deg);
  -o-transform: translate(-50%, -50%) rotate(-90deg);
`;

const DayContainerCol = styled(Col)`
  background-color: white;
  border-right: 1px solid #d0d0d0;
  color: black;
  font-size: 10px;
  min-height: 80px;
`;

const DateContainer = styled.div`
  color: ${(props) => props.color};
  text-align: center;
`;

const BigDate = styled.div`
  color: ${(props) => props.color};
  font-size: 28px;
  line-height: 1;
  float: right;
  padding-right: 2px;
`;

const SmallDateDescription = styled.div`
  color: ${(props) => props.color};
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: absolute;
  right: 3px;
  bottom: 1px;
`;

const Activity = styled.div`
  color: ${(props) => props.color};
  font-size: 12px;
  line-height: 1;
  padding-top: 3px;
  padding-left: 4px;
  :hover {
    color: #1890ff;
  }
`;

const ActivityUrl = styled.a`
  color: ${(props) => props.color};
`;

const MonthlyCalendar = observer(() => {
  const { clubModel, globalStateModel } = useMobxStore();
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [activities, setActivities] = useState<ICalendarActivity[]>([]);
  const [domains, setDomains] = useState<ICalendarDomains>({ activityTypes: [], groups: [], users: [] });
  const navigate = useNavigate();

  if (globalStateModel.startDate == null) {
    globalStateModel.setDashboard(
      navigate,
      '/calendar',
      moment().startOf('month').format(dateFormat),
      moment().endOf('month').format(dateFormat),
      1
    );
  }

  useEffect(() => {
    setLoaded(false);
    setActivities([]);
    const url = clubModel.modules.find((module) => module.name === 'Calendar')?.queryUrl;
    if (!url) return;

    const data = {
      iType: 'ACTIVITIES',
      iFromDate: moment(globalStateModel.startDate).isoWeekday(1).format('YYYY-MM-DD'),
      iToDate: moment(globalStateModel.endDate).isoWeekday(7).format('YYYY-MM-DD'),
    };
    const eventsData = {
      ...data,
      iType: 'EVENTS',
    };
    const domainsData = {
      ...data,
      iType: 'DOMAINS',
    };

    const activitesPromise = PostJsonData(url, data, true);
    const eventsPromise = PostJsonData(url, eventsData, true);
    const domainsPromise = PostJsonData(url, domainsData, true);

    Promise.all([activitesPromise, eventsPromise, domainsPromise])
      .then(([activitiesJson, eventsJson, domainsJson]: [ICalendarActivity[], ICalendarEvent[], ICalendarDomains]) => {
        setDomains(domainsJson);
        setActivities([
          ...activitiesJson,
          ...eventsJson.map(
            (event): ICalendarActivity => ({
              isEvent: true,
              activityId: `event#${event.calendarEventId}`,
              date: event.date,
              time: event.time === '00:00' ? '' : event.time,
              header: event.organiserName,
              place: event.name,
              url: `https://eventor.orientering.se/Events/Show/${event.eventorId}`,
              latitude: event.latitude,
              longitude: event.longitude,
              activityDurationMinutes: 0,
              description: event.name,
              groupId: 0,
              repeatingGid: null,
              repeatingModified: false,
            })
          ),
        ]);
        setLoaded(true);
      })
      .catch((e) => {
        message.error(e.message);
      });
  }, [globalStateModel.startDate]);

  const onPrevious = useCallback(
    () =>
      globalStateModel.setDashboard(
        navigate,
        '/calendar',
        moment(globalStateModel.startDate).add(-1, 'months').startOf('month').format(dateFormat),
        moment(globalStateModel.startDate).add(-1, 'months').endOf('month').format(dateFormat),
        1
      ),
    []
  );

  const onNext = useCallback(
    () =>
      globalStateModel.setDashboard(
        navigate,
        '/calendar',
        moment(globalStateModel.startDate).add(1, 'months').startOf('month').format(dateFormat),
        moment(globalStateModel.startDate).add(1, 'months').endOf('month').format(dateFormat),
        1
      ),
    []
  );

  const startDate = moment(globalStateModel.startDate);
  const startMonday = startDate.clone().isoWeekday(1);
  const endSunday = startDate.clone().endOf('month').isoWeekday(7);
  const days = [...Array(7)].map((_, i) => i);
  const weeks = [...Array(endSunday.add(1, 'days').diff(startMonday, 'weeks'))].map((_, i) => i);
  const isCurrentMonth = (date: moment.Moment) => startDate.format('MM') === date.format('MM');

  return (
    <MonthlyContainer>
      <MonthlyHeader>
        <Row>
          <Col span={4}>
            <LeftOutlined onClick={onPrevious} />
          </Col>
          <Col span={16} style={{ textAlign: 'center' }}>{`${GetMonthName(
            moment(globalStateModel.startDate),
            t
          )}`}</Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <RightOutlined onClick={onNext} />
          </Col>
        </Row>
      </MonthlyHeader>
      <MonthlyDayRow>
        <HeaderContainerCol span={1} />
        {days.map((day) => (
          <HeaderContainerCol span={day < 5 ? 3 : 4}>
            <DateContainer color={day === 6 ? 'red' : day === 5 ? 'grey' : 'black'}>
              {t(`calendar.DayOfWeek${day + 1}`)}
            </DateContainer>
          </HeaderContainerCol>
        ))}
      </MonthlyDayRow>
      {weeks.map((week) => (
        <MonthlyDayRow>
          <WeekCol span={1}>
            <WeekColText>v. {startMonday.clone().add(week, 'weeks').format('WW')}</WeekColText>
          </WeekCol>
          {GetDates(startMonday.clone().add(week, 'weeks'), 7, t).map((dateObj) => (
            <DayContainerCol
              span={dateObj.date.isoWeekday() < 6 ? 3 : 4}
              key={`MonthlyCalendar${dateObj.date.format('YYYYMMDD')}`}
            >
              <BigDate color={isCurrentMonth(dateObj.date) ? dateObj.color : dayNotInMonthColor}>
                {dateObj.date.format('D')}
              </BigDate>
              <SmallDateDescription color={isCurrentMonth(dateObj.date) ? dateObj.color : dayNotInMonthColor}>
                {dateObj.holidayName}
              </SmallDateDescription>
              <Skeleton loading={!loaded} active paragraph={false}>
                {activities
                  .filter((act) => act.date === dateObj.date.format('YYYY-MM-DD'))
                  .map((act) => (
                    <Activity
                      key={`activity#${act.activityId}`}
                      color={isCurrentMonth(dateObj.date) ? 'inherit' : dayNotInMonthColor}
                    >
                      {act.isEvent ? (
                        <ActivityUrl
                          href={act.url}
                          target="_blank"
                          color={isCurrentMonth(dateObj.date) ? 'black' : dayNotInMonthColor}
                        >
                          {act.time ? `${act.time}, ` : ''}
                          {act.header}
                          {act.place ? `, ${act.place}` : ''}
                        </ActivityUrl>
                      ) : (
                        <CalendarItem key={`activity#${act.activityId}`} calendarObject={act} domains={domains} />
                      )}
                    </Activity>
                  ))}
              </Skeleton>
            </DayContainerCol>
          ))}
        </MonthlyDayRow>
      ))}
    </MonthlyContainer>
  );
});

export default MonthlyCalendar;
