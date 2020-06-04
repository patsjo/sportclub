import React, { useState, useCallback, useEffect } from "react";
import { inject, observer } from "mobx-react";
import styled from "styled-components";
import { Row, Col, Skeleton, message } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { GetDates, GetMonthName } from "../calendarHelper";
import moment from "moment";
import { PostJsonData } from "../../../utils/api";
import CalendarItem from "../item/CalendarItem";
import { dateFormat } from "../../../utils/formHelper";
import { dashboardContents } from "../../../models/globalStateModel";

const dayNotInMonthColor = "#D0D0D0";

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
  height: 80px;
  line-height: 80px;
  text-align: center;
  overflow-y: hidden;
`;

const DayContainerCol = styled(Col)`
  background-color: white;
  border-right: 1px solid #d0d0d0;
  color: black;
  font-size: 10px;
  height: 80px;
  overflow-y: hidden;
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
  font-size: 12px;
  line-height: 1;
  padding-top: 2px;
  padding-left: 2px;
`;

const ActivityUrl = styled.a`
  color: black;
`;

const MonthlyCalendar = inject(
  "globalStateModel",
  "clubModel"
)(
  observer((props) => {
    const { clubModel, globalStateModel } = props;
    const { t } = useTranslation();
    const [loaded, setLoaded] = useState(false);
    const [activities, setActivities] = useState([]);
    const [domains, setDomains] = useState({});

    useEffect(() => {
      setLoaded(false);
      setActivities([]);
      const url = clubModel.modules.find((module) => module.name === "Calendar").queryUrl;
      const data = {
        iType: "ACTIVITIES",
        iFromDate: moment(globalStateModel.startDate).isoWeekday(1).format("YYYY-MM-DD"),
        iToDate: moment(globalStateModel.endDate).isoWeekday(7).format("YYYY-MM-DD")
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
          setDomains(domainsJson);
          setActivities([
            ...activitiesJson,
            ...eventsJson.map((event) => ({
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
        .catch((e) => {
          message.error(e.message);
        });
    }, [globalStateModel.startDate]);

    const onPrevious = useCallback(
      () =>
        globalStateModel.setDashboard(
          dashboardContents.calendar,
          moment(globalStateModel.startDate).add(-1, "months").startOf("month").format(dateFormat),
          moment(globalStateModel.startDate).add(-1, "months").endOf("month").format(dateFormat),
          1
        ),
      []
    );

    const onNext = useCallback(
      () =>
        globalStateModel.setDashboard(
          dashboardContents.calendar,
          moment(globalStateModel.startDate).add(1, "months").startOf("month").format(dateFormat),
          moment(globalStateModel.startDate).add(1, "months").endOf("month").format(dateFormat),
          1
        ),
      []
    );

    const startDate = moment(globalStateModel.startDate);
    const startMonday = startDate.clone().isoWeekday(1);
    const endSunday = startDate.clone().endOf("month").isoWeekday(7);
    const days = [...Array(7).keys()];
    const weeks = [...Array(endSunday.add(1, "days").diff(startMonday, "weeks")).keys()];
    const isCurrentMonth = (date) => startDate.format("MM") === date.format("MM");

    return (
      <MonthlyContainer>
        <MonthlyHeader>
          <Row>
            <Col span={4}>
              <LeftOutlined onClick={onPrevious} />
            </Col>
            <Col span={16} style={{ textAlign: "center" }}>{`${GetMonthName(
              moment(globalStateModel.startDate),
              t
            )}`}</Col>
            <Col span={4} style={{ textAlign: "right" }}>
              <RightOutlined onClick={onNext} />
            </Col>
          </Row>
        </MonthlyHeader>
        <MonthlyDayRow>
          <HeaderContainerCol span={1} />
          {days.map((day) => (
            <HeaderContainerCol span={day < 5 ? 3 : 4}>
              <DateContainer color={day === 6 ? "red" : day === 5 ? "grey" : "black"}>
                {t(`calendar.DayOfWeek${day + 1}`)}
              </DateContainer>
            </HeaderContainerCol>
          ))}
        </MonthlyDayRow>
        {weeks.map((week) => (
          <MonthlyDayRow>
            <WeekCol span={1}>{startMonday.clone().add(week, "weeks").format("WW")}</WeekCol>
            {GetDates(startMonday.clone().add(week, "weeks"), 7, t).map((dateObj) => (
              <DayContainerCol
                span={dateObj.date.isoWeekday() < 6 ? 3 : 4}
                key={`MonthlyCalendar${dateObj.date.format("YYYYMMDD")}`}
              >
                <BigDate color={isCurrentMonth(dateObj.date) ? dateObj.color : dayNotInMonthColor}>
                  {dateObj.date.format("D")}
                </BigDate>
                <SmallDateDescription color={isCurrentMonth(dateObj.date) ? dateObj.color : dayNotInMonthColor}>
                  {dateObj.holidayName}
                </SmallDateDescription>
                <Skeleton loading={!loaded} active paragraph={false}>
                  {activities
                    .filter((act) => act.date === dateObj.date.format("YYYY-MM-DD"))
                    .map((act) =>
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
              </DayContainerCol>
            ))}
          </MonthlyDayRow>
        ))}
      </MonthlyContainer>
    );
  })
);

export default MonthlyCalendar;
