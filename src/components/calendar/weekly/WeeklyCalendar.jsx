import React, { useState, useCallback, useEffect } from "react";
import { inject, observer } from "mobx-react";
import styled from "styled-components";
import { Row, Col, Icon, Skeleton, message } from "antd";
import { useTranslation } from "react-i18next";
import { GetDates } from "../calendarHelper";
import moment from "moment";
import { PostJsonData } from "../../../utils/api";
import CalendarItem from "../item/CalendarItem";

const WeeklyContainer = styled.div``;

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
`;

const WeeklyCalendar = inject(
  "globalStateModel",
  "clubModel"
)(
  observer(props => {
    const { clubModel, globalStateModel } = props;
    const { t } = useTranslation();
    const [firstDateInWeek, setFirstDateInWeek] = useState(
      moment()
        .startOf("day")
        .isoWeekday(1)
    );
    const [loaded, setLoaded] = useState(false);
    const [activities, setActivities] = useState([]);
    const [domains, setDomains] = useState({});

    useEffect(() => {
      setLoaded(false);
      setActivities([]);
      const url = clubModel.modules.find(module => module.name === "Calendar").queryUrl;
      const data = {
        iType: "ACTIVITIES",
        iFromDate: firstDateInWeek.format("YYYY-MM-DD"),
        iToDate: firstDateInWeek
          .clone()
          .add(7, "days")
          .format("YYYY-MM-DD")
      };
      const eventsData = {
        ...data,
        iType: "EVENTS"
      };
      const domainsData = {
        ...data,
        iType: "DOMAINS"
      };

      const activitesPromise = PostJsonData(url, data, true);
      const eventsPromise = PostJsonData(url, eventsData, true);
      const domainsPromise = PostJsonData(url, domainsData, true);

      Promise.all([activitesPromise, eventsPromise, domainsPromise])
        .then(([activitiesJson, eventsJson, domainsJson]) => {
          const activityGraphics = activitiesJson
            .filter(act => act.longitude && act.latitude)
            .map(act => ({
              geometry: {
                longitude: parseFloat(act.longitude),
                latitude: parseFloat(act.latitude)
              },
              attributes: {
                type: "calendar",
                name: act.header,
                time: act.date + (act.time === "00:00" ? "" : ` ${act.time}`)
              }
            }));
          const eventGraphics = eventsJson
            .filter(event => event.longitude && event.latitude)
            .map(event => ({
              geometry: {
                longitude: parseFloat(event.longitude),
                latitude: parseFloat(event.latitude)
              },
              attributes: {
                type: "event",
                name: `${event.organiserName}, ${event.name}`,
                time: event.date + (event.time === "00:00" ? "" : ` ${event.time}`)
              }
            }));
          globalStateModel.setGraphics("calendar", activityGraphics);
          globalStateModel.setGraphics("event", eventGraphics);
          setDomains(domainsJson);
          setActivities([
            ...activitiesJson,
            ...eventsJson.map(event => ({
              isEvent: true,
              activityId: `event#${event.calendarEventId}`,
              date: event.date,
              time: event.time === "00:00" ? "" : event.time,
              header: event.organiserName,
              place: event.name,
              url: `https://eventor.orientering.se/Events/Show/${event.eventorId}`
            }))
          ]);
          setLoaded(true);
        })
        .catch(e => {
          message.error(e.message);
        });
    }, [firstDateInWeek]);

    const onPrevious = useCallback(() => setFirstDateInWeek(date => date.clone().add(-7, "days")), []);
    const onNext = useCallback(() => setFirstDateInWeek(date => date.clone().add(7, "days")), []);

    return (
      <WeeklyContainer>
        <WeeklyHeader>
          <Row>
            <Col span={4}>
              <Icon type="left" onClick={onPrevious} />
            </Col>
            <Col span={16} style={{ textAlign: "center" }}>{`${t("calendar.Week")} ${firstDateInWeek.format(
              "W - GGGG"
            )}`}</Col>
            <Col span={4} style={{ textAlign: "right" }}>
              <Icon type="right" onClick={onNext} />
            </Col>
          </Row>
        </WeeklyHeader>
        {GetDates(firstDateInWeek, 7, t).map(dateObj => (
          <DayContainer key={`WeeklyCalendar${dateObj.date.format("YYYYMMDD")}`}>
            <Row>
              <Col span={4}>
                <DateContainer color={dateObj.color}>
                  <BigDate>{dateObj.date.format("D")}</BigDate>
                  <SmallDateDescription>{dateObj.dayOfWeek}</SmallDateDescription>
                  <SmallDateDescription>{dateObj.holidayName}</SmallDateDescription>
                </DateContainer>
              </Col>
              <Col span={20}>
                <Skeleton loading={!loaded} active paragraph={false}>
                  {activities
                    .filter(act => act.date === dateObj.date.format("YYYY-MM-DD"))
                    .map(act =>
                      act.isEvent ? (
                        <Activity key={`activity#${act.activityId}`}>
                          <ActivityUrl href={act.url} target="_blank">{`${act.time}${act.time ? ", " : ""}${
                            act.header
                          }${act.place ? ", " : ""}${act.place}`}</ActivityUrl>
                        </Activity>
                      ) : (
                        <CalendarItem key={`activity#${act.activityId}`} calendarObject={act} domains={domains} />
                      )
                    )}
                </Skeleton>
              </Col>
            </Row>
          </DayContainer>
        ))}
      </WeeklyContainer>
    );
  })
);

export default WeeklyCalendar;
