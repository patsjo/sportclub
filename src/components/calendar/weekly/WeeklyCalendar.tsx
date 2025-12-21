import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Col, message, Row, Skeleton } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IGraphic } from '../../../models/graphic';
import { PostJsonData } from '../../../utils/api';
import { useMobxStore } from '../../../utils/mobxStore';
import { ICalendarActivity, ICalendarDomains, ICalendarEvent } from '../../../utils/responseCalendarInterfaces';
import { DirectionPngUrl } from '../../map/OSMOrienteeringMap';
import { GetDates } from '../calendarHelper';
import CalendarItem from '../item/CalendarItem';

const WeeklyContainer = styled.div`
  padding-bottom: 4px;
`;

const WeeklyHeader = styled.div`
  background-color: white;
  border-bottom: 1px solid #d0d0d0;
  color: black;
  font-size: 16px;
  padding-bottom: 2px;
`;

const DayContainer = styled.div`
  background-color: white;
  border-bottom: 1px solid #d0d0d0;
  color: black;
  font-size: 10px;
`;

const DateContainer = styled.div`
  color: ${props => props.color};
  text-align: left;
  padding-right: 6px;
`;

const BigDate = styled.div`
  font-size: 32px;
  line-height: 1;
`;

const SmallDateDescription = styled.div`
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-bottom: 2px;
`;
const Activity = styled.div`
  font-size: 12px;
  line-height: 1;
  padding-top: 2px;
  padding-bottom: 2px;
`;

const ActivityUrl = styled.a`
  color: black;
  cursor: pointer;
`;

const DirectionImage = styled.img`
  margin-left: 4px;
  vertical-align: text-bottom;
`;

const WeeklyCalendar = observer(() => {
  const { clubModel, globalStateModel } = useMobxStore();
  const { t } = useTranslation();
  const [firstDateInWeek, setFirstDateInWeek] = useState(dayjs().startOf('day').isoWeekday(1));
  const [loaded, setLoaded] = useState(false);
  const [activities, setActivities] = useState<ICalendarActivity[]>([]);
  const [domains, setDomains] = useState<ICalendarDomains>({ activityTypes: [], groups: [], users: [] });

  useEffect(() => {
    let isMounted = true;

    setLoaded(false);
    setActivities([]);
    const url = clubModel.modules.find(module => module.name === 'Calendar')?.queryUrl;
    if (!url) return;

    const data = {
      iType: 'ACTIVITIES',
      iFromDate: firstDateInWeek.format('YYYY-MM-DD'),
      iToDate: firstDateInWeek.clone().add(7, 'days').format('YYYY-MM-DD')
    };
    const eventsData = {
      ...data,
      iType: 'EVENTS'
    };
    const domainsData = {
      ...data,
      iType: 'DOMAINS'
    };

    const activitesPromise = PostJsonData<ICalendarActivity[]>(url, data, true);
    const eventsPromise = PostJsonData<ICalendarEvent[]>(url, eventsData, true);
    const domainsPromise = PostJsonData<ICalendarDomains>(url, domainsData, true);

    Promise.all([activitesPromise, eventsPromise, domainsPromise])
      .then(([activitiesJson, eventsJson, domainsJson]) => {
        if (!activitiesJson || !eventsJson || !domainsJson) return;
        const activityGraphics = activitiesJson
          .filter(act => act.longitude && act.latitude)
          .map(
            (act): IGraphic => ({
              geometry: {
                type: 'point',
                longitude: act.longitude!,
                latitude: act.latitude!
              },
              attributes: {
                type: 'calendar',
                name: act.header,
                time: act.date + (act.time === '00:00' ? '' : ` ${act.time}`)
              }
            })
          );
        const eventGraphics = eventsJson
          .filter(event => event.longitude && event.latitude)
          .map(
            (event): IGraphic => ({
              geometry: {
                type: 'point',
                longitude: event.longitude,
                latitude: event.latitude
              },
              attributes: {
                type: 'event',
                name: `${event.organiserName}, ${event.name}`,
                time: event.date + (event.time === '00:00' ? '' : ` ${event.time}`)
              }
            })
          );
        if (isMounted) {
          globalStateModel.setGraphics(['calendar', 'event'], [...activityGraphics, ...eventGraphics]);
          setDomains(domainsJson);
          setActivities([
            ...activitiesJson,
            ...eventsJson.map(event => ({
              isEvent: true,
              activityId: `event#${event.calendarEventId}`,
              date: event.date,
              time: event.time === '00:00' ? '' : event.time,
              header: event.organiserName,
              place: event.name,
              url: `https://eventor.orientering.se/Events/Show/${event.eventorId}`,
              longitude: event.longitude,
              latitude: event.latitude,
              activityDurationMinutes: 0,
              description: event.name,
              groupId: 0,
              repeatingGid: null,
              repeatingModified: false
            }))
          ]);
          setLoaded(true);
        }
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
      });

    return () => {
      isMounted = false;
    };
  }, [clubModel.modules, firstDateInWeek, globalStateModel, setLoaded]);

  const onPrevious = useCallback(() => setFirstDateInWeek(date => date.clone().add(-7, 'days')), []);
  const onNext = useCallback(() => setFirstDateInWeek(date => date.clone().add(7, 'days')), []);

  return (
    <WeeklyContainer>
      <WeeklyHeader>
        <Row>
          <Col span={4}>
            <LeftOutlined onClick={onPrevious} />
          </Col>
          <Col span={16} style={{ textAlign: 'center' }}>{`${t('calendar.Week')} ${firstDateInWeek.format(
            'W - GGGG'
          )}`}</Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <RightOutlined onClick={onNext} />
          </Col>
        </Row>
      </WeeklyHeader>
      {GetDates(firstDateInWeek, 7, t).map(dateObj => (
        <DayContainer key={`WeeklyCalendar${dateObj.date.format('YYYYMMDD')}`}>
          <Row>
            <Col span={4}>
              <DateContainer color={dateObj.color}>
                <BigDate>{dateObj.date.format('D')}</BigDate>
                <SmallDateDescription>{dateObj.dayOfWeek}</SmallDateDescription>
                <SmallDateDescription>{dateObj.holidayName}</SmallDateDescription>
              </DateContainer>
            </Col>
            <Col span={20}>
              <Skeleton active loading={!loaded} paragraph={false}>
                {activities
                  .filter(act => act.date === dateObj.date.format('YYYY-MM-DD'))
                  .map(act =>
                    act.isEvent ? (
                      <Activity key={`activity#${act.activityId}`}>
                        <ActivityUrl href={act.url} target="_blank">{`${act.time}${act.time ? ', ' : ''}${act.header}${
                          act.place ? ', ' : ''
                        }${act.place}`}</ActivityUrl>
                        {act.longitude && act.latitude ? (
                          <ActivityUrl
                            href={`https://maps.google.com/maps?saddr=&daddr=N${act.latitude},E${act.longitude}`}
                            target="_blank"
                          >
                            <DirectionImage src={DirectionPngUrl} width="16" height="16" />
                          </ActivityUrl>
                        ) : null}
                      </Activity>
                    ) : (
                      <CalendarItem key={`activity#${act.activityId}`} calendarObject={act} domains={domains}>
                        {act.longitude && act.latitude ? (
                          <ActivityUrl
                            href={`https://maps.google.com/maps?saddr=&daddr=N${act.latitude},E${act.longitude}`}
                            target="_blank"
                            onClick={e => e.stopPropagation()}
                          >
                            <DirectionImage src={DirectionPngUrl} width="16" height="16" />
                          </ActivityUrl>
                        ) : null}
                      </CalendarItem>
                    )
                  )}
              </Skeleton>
            </Col>
          </Row>
        </DayContainer>
      ))}
    </WeeklyContainer>
  );
});

export default WeeklyCalendar;
