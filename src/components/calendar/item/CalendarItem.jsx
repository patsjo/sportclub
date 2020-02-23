import React, { Component } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import FadeOutItem from "../../fadeOutItem/FadeOutItem";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
import CalendarEdit from "./CalendarEdit";
import { PostJsonData } from "../../../utils/api";
import withForwardedRef from "../../../utils/withForwardedRef";

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
  font-size: 11px;
  font-weight: normal;
  text-align: justify;
  text-justify: inter-word;
  white-space: pre-line;
`;

const CalendarBy = styled.div`
  font-size: 10px;
  font-weight: normal;
  text-align: right;
  text-color: #606060;
`;
const Activity = styled.div`
  font-size: 12px;
  line-height: 1;
  padding-top: 2px;
  padding-bottom: 2px;
`;

// @inject("clubModel")
// @observer
const CalendarItem = inject(
  "clubModel",
  "sessionModel",
  "globalStateModel"
)(
  observer(
    class CalendarItem extends Component {
      static propTypes = {
        calendarObject: PropTypes.object.isRequired,
        domains: PropTypes.object.isRequired
      };

      render() {
        const { t, sessionModel, clubModel, forwardedRef, calendarObject, domains } = this.props;
        const moduleInfo = clubModel.module("Calendar");

        const Header = calendarObject.url ? (
          <CalendarHeader>
            <a href={calendarObject.url} target="_blank" rel="noopener noreferrer">
              <div
                dangerouslySetInnerHTML={{
                  __html: calendarObject.header
                }}
              />
            </a>
          </CalendarHeader>
        ) : (
          <CalendarHeader>
            <div dangerouslySetInnerHTML={{ __html: calendarObject.header }} />
          </CalendarHeader>
        );

        return (
          <FadeOutItem
            ref={forwardedRef}
            module={moduleInfo}
            content={
              <Activity key={`activity#${calendarObject.activityId}`}>{`${calendarObject.time}${
                calendarObject.time ? ", " : ""
              }${calendarObject.header}${calendarObject.place ? ", " : ""}${calendarObject.place}`}</Activity>
            }
            modalContent={
              <ContentHolder>
                {Header}
                <CalendarTime>{`${calendarObject.date}${calendarObject.time ? ", " : ""}${
                  calendarObject.time
                }`}</CalendarTime>
                <CalendarText>{`${t("calendar.ActivityType")}: ${
                  domains.activityTypes.find(activityType => activityType.code === calendarObject.activityTypeId)
                    .description
                }`}</CalendarText>
                <CalendarText>{`${t("calendar.Group")}: ${
                  domains.groups.find(group => group.code === calendarObject.groupId).description
                }`}</CalendarText>
                {calendarObject.place ? (
                  <CalendarText>{`${t("calendar.Place")}: ${calendarObject.place}`}</CalendarText>
                ) : null}
                <CalendarText>{calendarObject.description}</CalendarText>
                <CalendarBy>
                  {domains.users.find(user => user.code === calendarObject.responsibleUserId).description}
                </CalendarBy>
              </ContentHolder>
            }
            modalColumns={3}
            editFormContent={
              sessionModel.isAdmin || calendarObject.responsibleUserId.toString() === sessionModel.id ? (
                <CalendarEdit
                  title={t("calendar.Edit")}
                  calendarObject={calendarObject}
                  domains={domains}
                  onChange={updatedCalendarObject => {}}
                />
              ) : null
            }
            deletePromise={
              sessionModel.isAdmin || calendarObject.responsibleUserId.toString() === sessionModel.id
                ? () =>
                    PostJsonData(
                      moduleInfo.deleteUrl,
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
            onDelete={() => {}}
          />
        );
      }
    }
  )
);
const CalendarItemWithI18n = withTranslation()(CalendarItem); // pass `t` function to App

export default withForwardedRef(CalendarItemWithI18n);
