import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { Spin, Progress, message } from 'antd';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import { observer, inject } from 'mobx-react';
import { GetJsonData, PostJsonData } from '../../utils/api';
import moment from 'moment';
import { dateFormat } from '../../utils/formHelper';
import {
  GetSplitTimes,
  GetRelaySplitTimes,
  GetMissingTime,
  GetTimeWithHour,
  ConvertTimeToSeconds,
} from '../../utils/resultHelper';
import { genders } from '../../utils/resultConstants';
import { AddMapCompetitorConfirmModal } from './AddMapCompetitorConfirmModal';

const flatten = (list) => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
const MakeArray = (object) => (!object ? [] : Array.isArray(object) ? object : [object]);

// @inject("clubModel")
// @observer
const ResultWizardStep1ChooseRace = inject(
  'clubModel',
  'raceWizardModel',
  'sessionModel'
)(
  observer(
    class ResultWizardStep1ChooseRace extends Component {
      constructor(props) {
        super(props);
        this.state = {
          total: 0,
          processed: 0,
          currentEvent: undefined,
        };
      }

      load = async () => {
        const self = this;
        const { t, raceWizardModel, clubModel, sessionModel, onFailed, onSave, onClose } = this.props;

        try {
          const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
          const queryData = {
            iType: 'EVENTS',
            iClubId: clubModel.raceClubs.selectedClub.clubId,
            iFromDate: moment(raceWizardModel.queryStartDate, dateFormat).add(-7, 'days').format(dateFormat),
            iToDate: moment(raceWizardModel.queryEndDate, dateFormat).add(7, 'days').format(dateFormat),
          };

          const alreadySavedEventsPromise = PostJsonData(url, queryData, true, sessionModel.authorizationHeader);
          const entriesPromise = GetJsonData(
            clubModel.corsProxy +
              encodeURIComponent(
                clubModel.eventor.entriesUrl +
                  '?organisationIds=' +
                  clubModel.raceClubs.selectedClub.eventorOrganisationId +
                  '&fromEventDate=' +
                  raceWizardModel.queryStartDate +
                  '&toEventDate=' +
                  raceWizardModel.queryEndDate +
                  '&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true'
              ) +
              '&headers=' +
              encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
            true
          );
          const noEntriesPromise = raceWizardModel.queryForEventWithNoEntry
            ? new Promise((resolve, reject) => {
                GetJsonData(
                  clubModel.corsProxy +
                    encodeURIComponent(
                      clubModel.eventor.competitorsUrl +
                        '?organisationId=' +
                        clubModel.raceClubs.selectedClub.eventorOrganisationId
                    ) +
                    '&headers=' +
                    encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
                  true
                )
                  .then((competitorsJson) => {
                    if (!competitorsJson || !Array.isArray(competitorsJson.Competitor)) {
                      resolve({ Event: [] });
                      return;
                    }
                    const competitorsPromiseis = competitorsJson.Competitor.map((c) =>
                      GetJsonData(
                        clubModel.corsProxy +
                          encodeURIComponent(
                            clubModel.eventor.personResultUrl +
                              '?personId=' +
                              c.Person.PersonId +
                              '&fromDate=' +
                              raceWizardModel.queryStartDate +
                              '&toDate=' +
                              raceWizardModel.queryEndDate
                          ) +
                          '&headers=' +
                          encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
                        true
                      )
                    );
                    Promise.all(competitorsPromiseis)
                      .then((competitorsJsons) => {
                        if (!competitorsJsons) {
                          resolve({ Event: [] });
                          return;
                        }
                        const events = { Event: [] };
                        if (!Array.isArray(competitorsJsons)) {
                          competitorsJsons = [competitorsJsons];
                        }
                        competitorsJsons.forEach((c) => {
                          if (c.ResultList) {
                            if (!Array.isArray(c.ResultList)) {
                              c.ResultList = [c.ResultList];
                            }
                            c.ResultList.forEach((r) => {
                              if (!Array.isArray(r.ClassResult)) {
                                r.ClassResult = [r.ClassResult];
                              }
                              let isCurrentClub = false;
                              r.ClassResult.forEach((cr) => {
                                if (Array.isArray(cr.PersonResult)) {
                                  cr.PersonResult = cr.PersonResult[0];
                                }
                                if (
                                  cr.PersonResult &&
                                  (!cr.PersonResult.Organisation ||
                                    cr.PersonResult.Organisation.OrganisationId ===
                                      clubModel.raceClubs.selectedClub.eventorOrganisationId.toString())
                                ) {
                                  isCurrentClub = true;
                                }
                                if (Array.isArray(cr.TeamResult)) {
                                  cr.TeamResult = cr.TeamResult[0];
                                }
                                if (
                                  (cr.TeamResult &&
                                    cr.TeamResult.Organisation.OrganisationId ===
                                      clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()) ||
                                  (cr.TeamResult &&
                                    cr.TeamResult.TeamMemberResult &&
                                    (!cr.TeamResult.TeamMemberResult.Organisation ||
                                      cr.TeamResult.TeamMemberResult.Organisation.OrganisationId ===
                                        clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()))
                                ) {
                                  isCurrentClub = true;
                                }
                              });
                              if (isCurrentClub && !events.Event.some((e) => e.EventId === r.Event.EventId)) {
                                events.Event.push(r.Event);
                              }
                            });
                          }
                        });
                        resolve(events);
                      })
                      .catch((e) => reject(e));
                  })
                  .catch((e) => reject(e));
              })
            : new Promise((resolve) => resolve(undefined));

          const oringenEventsPromise = GetJsonData(
            clubModel.corsProxy +
              encodeURIComponent(
                clubModel.eventor.eventsUrl +
                  '?organisationIds=' +
                  self.props.clubModel.eventor.oRingenOrganisationId +
                  '&fromDate=' +
                  raceWizardModel.queryStartDate +
                  '&toDate=' +
                  raceWizardModel.queryEndDate +
                  '&includeAttributes=true'
              ) +
              '&headers=' +
              encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
            true
          );
          let [alreadySavedEventsJson, entriesJson, noEntriesJson, oringenEventsJson] = await Promise.all([
            alreadySavedEventsPromise,
            entriesPromise,
            noEntriesPromise,
            oringenEventsPromise,
          ]);
          // eslint-disable-next-line eqeqeq
          if (entriesJson == undefined || entriesJson.Entry == undefined) {
            entriesJson = { Entry: [] };
          } else if (!Array.isArray(entriesJson.Entry)) {
            entriesJson.Entry = [entriesJson.Entry];
          }
          // eslint-disable-next-line eqeqeq
          if (oringenEventsJson == undefined || oringenEventsJson.Event == undefined) {
            oringenEventsJson = { Event: [] };
          } else if (!Array.isArray(oringenEventsJson.Event)) {
            oringenEventsJson.Event = [oringenEventsJson.Event];
          }
          // eslint-disable-next-line eqeqeq
          if (noEntriesJson == undefined || noEntriesJson.Event == undefined) {
            noEntriesJson = { Event: [] };
          } else if (!Array.isArray(noEntriesJson.Event)) {
            noEntriesJson.Event = [noEntriesJson.Event];
          }
          oringenEventsJson.Event = [...oringenEventsJson.Event, ...noEntriesJson.Event];
          entriesJson.Entry.forEach((entry) => {
            if (Array.isArray(entry.Event.EventRace)) {
              entry.EventRaceId = entry.Event.EventRace.map((eventRace) => eventRace.EventRaceId);
            } else {
              entry.EventRaceId = entry.Event.EventRace.EventRaceId;
            }
          });
          let events = [
            ...new Set([
              ...flatten(entriesJson.Entry.map((entry) => entry.EventRaceId)),
              ...flatten(oringenEventsJson.Event.map((event) => event.EventRace)).map(
                (eventRace) => eventRace.EventRaceId
              ),
            ]),
          ]
            // eslint-disable-next-line eqeqeq
            .filter((eventRaceId) => eventRaceId != undefined)
            .map((eventRaceId) => {
              return { EventRaceId: eventRaceId };
            });
          events.forEach((event) => {
            let entry = entriesJson.Entry.find((e) =>
              Array.isArray(e.EventRaceId)
                ? e.EventRaceId.includes(event.EventRaceId)
                : e.EventRaceId === event.EventRaceId
            );
            // eslint-disable-next-line eqeqeq
            if (entry == undefined) {
              entry = {
                Event: oringenEventsJson.Event.find((e) =>
                  Array.isArray(e.EventRace)
                    ? e.EventRace.map((er) => er.EventRaceId).includes(event.EventRaceId)
                    : e.EventRace.EventRaceId === event.EventRaceId
                ),
              };
            }
            event.Event = {
              ...entry.Event,
            };
          });
          alreadySavedEventsJson.forEach((saved) => {
            const event = events.find(
              (evt) =>
                saved.eventorId.toString() === evt.Event.EventId && saved.eventorRaceId.toString() === evt.EventRaceId
            );
            saved.isRelay =
              event?.Event &&
              event.Event['@attributes'] &&
              event.Event['@attributes'].eventForm &&
              event.Event['@attributes'].eventForm.toLowerCase().indexOf('relay') >= 0;
          });
          const allSaved = alreadySavedEventsJson.filter((saved) => saved.eventorId && saved.eventorRaceId);
          for (let savedIndex = 0; savedIndex < allSaved.length; savedIndex++) {
            const saved = allSaved[savedIndex];
            self.setState({
              total: allSaved.length,
              processed: savedIndex,
              currentEvent: `${saved.date} ${saved.name}`,
            });
            raceWizardModel.setValue('selectedEventId', saved.eventId);
            raceWizardModel.setValue('selectedEventorId', saved.eventorId);
            raceWizardModel.setValue('selectedEventorRaceId', saved.eventorRaceId);
            raceWizardModel.setValue('overwrite', true);
            const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
            const editResultPromise = PostJsonData(
              url,
              { iType: 'EVENT', iEventId: saved.eventId },
              true,
              sessionModel.authorizationHeader
            );

            const resultPromise = saved.eventorId
              ? GetJsonData(
                  clubModel.corsProxy +
                    encodeURIComponent(
                      clubModel.eventor.resultUrl +
                        '?eventId=' +
                        saved.eventorId +
                        '&organisationIds=' +
                        clubModel.raceClubs.selectedClub.eventorOrganisationId +
                        `&top=${saved.isRelay ? 30 : 15}&includeSplitTimes=true`
                    ) +
                    '&headers=' +
                    encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
                  false
                )
              : new Promise((resolve) => resolve(undefined));
            let [editResultJson, resultJson] = await Promise.all([editResultPromise, resultPromise]);
            raceWizardModel.setValue('raceEvent', editResultJson);

            const isRelay = editResultJson.isRelay;

            if (resultJson != null && Object.keys(resultJson).length > 0) {
              if (Array.isArray(resultJson.Event?.EventRace)) {
                resultJson.EventRace = resultJson.Event.EventRace.find(
                  (eventRace) => eventRace.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                );
                resultJson.Event.Name = resultJson.Event.Name + ', ' + resultJson.EventRace.Name;
              } else {
                resultJson.EventRace = resultJson.Event?.EventRace;
              }
            }

            // eslint-disable-next-line eqeqeq
            if (editResultJson && resultJson != undefined && resultJson.ClassResult != undefined) {
              const raceWinnerResults = [];
              const ClassResults = MakeArray(resultJson.ClassResult);
              if (!isRelay) {
                for (let i = 0; i < ClassResults.length; i++) {
                  const classResult = ClassResults[i];

                  // eslint-disable-next-line eqeqeq
                  if (classResult.PersonResult != undefined) {
                    const personResults = Array.isArray(classResult.PersonResult)
                      ? classResult.PersonResult.filter(
                          (personResult) =>
                            // eslint-disable-next-line eqeqeq
                            personResult.RaceResult == undefined ||
                            personResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                        )
                      : // eslint-disable-next-line eqeqeq
                      classResult.PersonResult.RaceResult == undefined ||
                        classResult.PersonResult.RaceResult.EventRaceId ===
                          raceWizardModel.selectedEventorRaceId.toString()
                      ? [classResult.PersonResult]
                      : [];

                    personResults.forEach((personResult) => {
                      // eslint-disable-next-line eqeqeq
                      if (personResult.Result == undefined && personResult.RaceResult.Result != undefined) {
                        personResult.Result = personResult.RaceResult.Result;
                      }
                    });
                    const { splitTimes, bestSplitTimes, secondBestSplitTimes } = GetSplitTimes(personResults);

                    const clubPersonResults =
                      splitTimes.length > 0
                        ? personResults.filter(
                            (personResult) =>
                              personResult.Organisation &&
                              personResult.Organisation.OrganisationId ===
                                clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()
                          )
                        : [];

                    for (let j = 0; j < clubPersonResults.length; j++) {
                      const personResult = clubPersonResults[j];
                      let competitor;
                      if (typeof personResult.Person.PersonId === 'string' && personResult.Person.PersonId.length > 0) {
                        if (!competitor) {
                          competitor = clubModel.raceClubs.selectedClub.competitorByEventorId(
                            parseInt(personResult.Person.PersonId)
                          );
                        }

                        if (!competitor) {
                          competitor = clubModel.raceClubs.selectedClub.competitors.find(
                            (c) =>
                              c.firstName === personResult.Person.PersonName.Given &&
                              c.lastName === personResult.Person.PersonName.Family &&
                              c.birthDay === personResult.Person.BirthDate?.Date
                          );
                          if (competitor) {
                            await competitor.addEventorId(
                              clubModel.modules.find((module) => module.name === 'Results').addUrl,
                              personResult.Person.PersonId
                            );
                          }
                        }
                      }
                      if (!competitor) {
                        competitor = await AddMapCompetitorConfirmModal(
                          t,
                          undefined,
                          personResult.Person.PersonId,
                          {
                            iType: 'COMPETITOR',
                            iFirstName: personResult.Person.PersonName.Given,
                            iLastName: personResult.Person.PersonName.Family,
                            iBirthDay:
                              personResult.Person.BirthDate == null ? null : personResult.Person.BirthDate?.Date,
                            iGender:
                              personResult.Person['@attributes'] == null
                                ? null
                                : personResult.Person['@attributes'].sex === 'F'
                                ? genders.FeMale
                                : genders.Male,
                            iClubId: clubModel.raceClubs.selectedClub.clubId,
                            iStartDate: '1930-01-01',
                            iEndDate: null,
                            iEventorCompetitorId:
                              typeof personResult.Person.PersonId !== 'string' ||
                              personResult.Person.PersonId.length === 0
                                ? null
                                : personResult.Person.PersonId,
                          },
                          undefined,
                          clubModel
                        );
                      }

                      const didNotStart = personResult.Result.CompetitorStatus['@attributes'].value === 'DidNotStart';
                      const misPunch = personResult.Result.CompetitorStatus['@attributes'].value === 'MisPunch';
                      const ok = personResult.Result.CompetitorStatus['@attributes'].value === 'OK';
                      const valid = ok && !didNotStart && !misPunch;

                      const missingTime = GetMissingTime(
                        personResult.Person?.PersonId,
                        splitTimes,
                        bestSplitTimes,
                        secondBestSplitTimes
                      );
                      const result = raceWizardModel.raceEvent.results.find(
                        (r) =>
                          r.competitorId === competitor.competitorId &&
                          r.competitorTime === (valid ? GetTimeWithHour(personResult.Result.Time) : null)
                      );
                      if (result && result.missingTime !== missingTime) {
                        result.setValue('missingTime', missingTime);
                      }
                    }
                  }
                }
              } else if (isRelay && editResultJson) {
                for (let i = 0; i < ClassResults.length; i++) {
                  const classResult = ClassResults[i];

                  // eslint-disable-next-line eqeqeq
                  if (classResult.TeamResult != undefined) {
                    const teamResults = Array.isArray(classResult.TeamResult)
                      ? classResult.TeamResult.filter(
                          (teamResult) =>
                            // eslint-disable-next-line eqeqeq
                            teamResult.RaceResult == undefined ||
                            teamResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                        )
                      : // eslint-disable-next-line eqeqeq
                      classResult.TeamResult.RaceResult == undefined ||
                        classResult.TeamResult.RaceResult.EventRaceId ===
                          raceWizardModel.selectedEventorRaceId.toString()
                      ? [classResult.TeamResult]
                      : [];

                    teamResults.forEach((teamResult) => {
                      if (
                        // eslint-disable-next-line eqeqeq
                        teamResult.TeamMemberResult == undefined &&
                        // eslint-disable-next-line eqeqeq
                        teamResult.RaceResult.TeamMemberResult != undefined
                      ) {
                        teamResult.TeamMemberResult = teamResult.RaceResult.TeamMemberResult;
                      }
                    });
                    const allLegsSplitTimes = GetRelaySplitTimes(teamResults);

                    const clubTeamMemberResults = [];
                    teamResults.forEach((teamResult) => {
                      const members = MakeArray(teamResult.TeamMemberResult);
                      const teamOrganisations = MakeArray(teamResult.Organisation);
                      const hasClubMembers = teamOrganisations.some(
                        (org) =>
                          org.OrganisationId === clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()
                      );
                      members.forEach((member) => {
                        const competitor =
                          hasClubMembers &&
                          typeof member.Person.PersonId === 'string' &&
                          member.Person.PersonId.length > 0
                            ? clubModel.raceClubs.selectedClub.competitorByEventorId(parseInt(member.Person.PersonId))
                            : null;

                        if (
                          (member.Organisation &&
                            member.Organisation.OrganisationId ===
                              clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()) ||
                          competitor ||
                          (hasClubMembers && teamOrganisations.length === 1)
                        ) {
                          clubTeamMemberResults.push({
                            ...member,
                            Competitor: competitor,
                            TeamName: teamResult.TeamName,
                            TeamTime: teamResult.Time,
                            TeamTimeDiff: teamResult.TimeDiff,
                            TeamPosition: teamResult.ResultPosition,
                            TeamStatus: teamResult.TeamStatus,
                            BibNumber: teamResult.BibNumber,
                          });
                        }
                      });
                    });

                    for (let j = 0; j < clubTeamMemberResults.length; j++) {
                      const teamMemberResult = clubTeamMemberResults[j];
                      let competitor = teamMemberResult.Competitor;
                      if (
                        typeof teamMemberResult.Person.PersonId === 'string' &&
                        teamMemberResult.Person.PersonId.length > 0
                      ) {
                        if (!competitor) {
                          competitor = clubModel.raceClubs.selectedClub.competitors.find(
                            (c) =>
                              c.firstName === teamMemberResult.Person.PersonName.Given &&
                              c.lastName === teamMemberResult.Person.PersonName.Family &&
                              c.birthDay === teamMemberResult.Person.BirthDate?.Date
                          );
                          if (competitor) {
                            await competitor.addEventorId(
                              clubModel.modules.find((module) => module.name === 'Results').addUrl,
                              teamMemberResult.Person.PersonId
                            );
                          }
                        }
                      }
                      if (!competitor) {
                        competitor = await AddMapCompetitorConfirmModal(
                          t,
                          undefined,
                          teamMemberResult.Person.PersonId,
                          {
                            iType: 'COMPETITOR',
                            iFirstName: teamMemberResult.Person.PersonName.Given,
                            iLastName: teamMemberResult.Person.PersonName.Family,
                            iBirthDay:
                              // eslint-disable-next-line eqeqeq
                              teamMemberResult.Person.BirthDate == undefined
                                ? null
                                : teamMemberResult.Person.BirthDate?.Date,
                            iGender:
                              teamMemberResult.Person['@attributes'] == null
                                ? null
                                : teamMemberResult.Person['@attributes'].sex === 'F'
                                ? genders.FeMale
                                : genders.Male,
                            iClubId: clubModel.raceClubs.selectedClub.clubId,
                            iStartDate: '1930-01-01',
                            iEndDate: null,
                            iEventorCompetitorId:
                              typeof teamMemberResult.Person.PersonId !== 'string' ||
                              teamMemberResult.Person.PersonId.length === 0
                                ? null
                                : teamMemberResult.Person.PersonId,
                          },
                          undefined,
                          clubModel
                        );
                      }

                      const didNotStart = teamMemberResult.CompetitorStatus['@attributes'].value === 'DidNotStart';
                      const misPunch = teamMemberResult.CompetitorStatus['@attributes'].value === 'MisPunch';
                      const ok = teamMemberResult.CompetitorStatus['@attributes'].value === 'OK';
                      const valid = ok && !didNotStart && !misPunch;
                      const legSplitTimes = allLegsSplitTimes.find((lst) => lst.leg === teamMemberResult.Leg);
                      const missingTime = GetMissingTime(
                        teamMemberResult.Person.PersonId,
                        legSplitTimes.splitTimes,
                        legSplitTimes.bestSplitTimes,
                        legSplitTimes.secondBestSplitTimes
                      );
                      const result = raceWizardModel.raceEvent.teamResults.find(
                        (r) =>
                          r.competitorId === competitor.competitorId &&
                          r.competitorTime === (valid ? GetTimeWithHour(teamMemberResult.Time) : null)
                      );
                      if (result && result.missingTime !== missingTime) {
                        result.setValue('missingTime', missingTime);
                      }
                    }
                  }
                }
              }
              onSave();
            }
          }
          onClose();
        } catch (e) {
          onFailed(e);
        }
      };

      componentDidMount() {
        this.load().then(() => {});
      }

      onSelectChange = (selectedRowKeys) => {
        const { raceWizardModel, onValidate } = this.props;
        const selected = JSON.parse(selectedRowKeys);

        raceWizardModel.setValue('selectedEventId', parseInt(selected.selectedEventId));
        raceWizardModel.setValue(
          'selectedEventorId',
          selected.selectedEventorId ? parseInt(selected.selectedEventorId) : null
        );
        raceWizardModel.setValue(
          'selectedEventorRaceId',
          selected.selectedEventorRaceId ? parseInt(selected.selectedEventorRaceId) : null
        );
        raceWizardModel.setValue('overwrite', selected.existInEventor);
        this.setState({ selectedRowKeys });
        onValidate(true);
      };

      render() {
        const { total, processed, currentEvent } = this.state;

        return total > 0 ? (
          <SpinnerDiv>
            <Progress type="circle" percent={((100 * processed) / total).toFixed(1)} />
            <div>{currentEvent}</div>
          </SpinnerDiv>
        ) : (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        );
      }
    }
  )
);

const ResultWizardStep1ChooseRaceWithI18n = withTranslation()(ResultWizardStep1ChooseRace); // pass `t` function to App

export default ResultWizardStep1ChooseRaceWithI18n;
