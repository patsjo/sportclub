import { Progress, Spin } from 'antd';
import { observer } from 'mobx-react';
import { IRaceCompetitor, IRaceEventSnapshotIn } from 'models/resultModel';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from 'utils/mobxStore';
import {
  IEventorEventRace,
  IEventorOrganisation,
  IEventorResults,
  IEventorResultStatus,
  IEventorTeamMemberResult,
  IEventorTeamResult,
} from 'utils/responseEventorInterfaces';
import { IEventViewResultResponse } from 'utils/responseInterfaces';
import { useResultWizardStore } from 'utils/resultWizardStore';
import { PostJsonData } from '../../utils/api';
import { dateFormat } from '../../utils/formHelper';
import { genders, ManuallyEditedMissingTimePostfix } from '../../utils/resultConstants';
import { GetMissingTime, GetRelaySplitTimes, GetSplitTimes, GetTimeWithHour } from '../../utils/resultHelper';
import { SpinnerDiv } from '../styled/styled';
import { AddMapCompetitorConfirmModal } from './AddMapCompetitorConfirmModal';

interface IResultWizardStep1ChooseRaceRerunProps {
  onFailed: (e: any) => void;
  onSave: () => void;
  onClose: () => void;
}
const ResultWizardStep1ChooseRaceRerun = observer(
  ({ onFailed, onSave, onClose }: IResultWizardStep1ChooseRaceRerunProps) => {
    const { t } = useTranslation();
    const { clubModel, sessionModel } = useMobxStore();
    const { raceWizardModel } = useResultWizardStore();
    const [processed, setProcessed] = useState(0);
    const [total, setTotal] = useState(0);
    const [currentEvent, setCurrentEvent] = useState('');

    const load = async () => {
      try {
        const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
        if (!url || !clubModel.raceClubs || !clubModel.eventor) {
          onClose && onClose();
          return;
        }

        const queryData = {
          iType: 'EVENTS',
          iClubId: clubModel.raceClubs.selectedClub.clubId,
          iFromDate: moment(raceWizardModel.queryStartDate, dateFormat).add(-7, 'days').format(dateFormat),
          iToDate: moment(raceWizardModel.queryEndDate, dateFormat).add(7, 'days').format(dateFormat),
        };

        const allSaved: IEventViewResultResponse[] = await PostJsonData(
          url,
          queryData,
          true,
          sessionModel.authorizationHeader
        );
        setTotal(allSaved.length);

        for (let savedIndex = 0; savedIndex < allSaved.length; savedIndex++) {
          const saved = allSaved[savedIndex];
          setProcessed(savedIndex);
          setCurrentEvent(`${saved.date} ${saved.name}`);

          raceWizardModel.setNumberValueOrNull('selectedEventId', saved.eventId);
          raceWizardModel.setNumberValueOrNull('selectedEventorId', saved.eventorId);
          raceWizardModel.setNumberValueOrNull('selectedEventorRaceId', saved.eventorRaceId);
          raceWizardModel.setBooleanValue('overwrite', true);

          const editResultPromise = PostJsonData(
            url,
            { iType: 'EVENT', iEventId: saved.eventId },
            true,
            sessionModel.authorizationHeader
          );

          const resultPromise =
            saved.eventorId > 0
              ? PostJsonData(
                  clubModel.eventorCorsProxy,
                  {
                    csurl: encodeURIComponent(
                      clubModel.eventor.resultUrl +
                        '?eventId=' +
                        saved.eventorId +
                        '&organisationIds=' +
                        clubModel.eventor.organisationId +
                        ',' +
                        clubModel.eventor.districtOrganisationId +
                        `&top=${saved.isRelay ? 30 : 15}&includeSplitTimes=true`
                    ),
                  },
                  false
                )
              : new Promise((resolve) => resolve(undefined));
          const [editResultJson, resultJson]: [IRaceEventSnapshotIn, IEventorResults | undefined] = await Promise.all([
            editResultPromise,
            resultPromise,
          ]);
          raceWizardModel.setRaceEvent(editResultJson);

          const isRelay = editResultJson.isRelay;
          let eventRace: IEventorEventRace | undefined;

          if (resultJson != null && Object.keys(resultJson).length > 0) {
            if (Array.isArray(resultJson.Event?.EventRace)) {
              eventRace = resultJson.Event.EventRace.find(
                (eventRace) => eventRace.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
              );
              resultJson.Event.Name = resultJson.Event.Name + ', ' + eventRace?.Name;
            } else {
              eventRace = resultJson.Event?.EventRace;
            }
          }

          if (editResultJson && resultJson != null && resultJson.ClassResult != null) {
            const raceWinnerResults = [];
            const classResults = Array.isArray(resultJson.ClassResult)
              ? resultJson.ClassResult
              : [resultJson.ClassResult];
            if (!isRelay) {
              for (let i = 0; i < classResults.length; i++) {
                const classResult = classResults[i];

                if (classResult.PersonResult != null) {
                  const personResults = Array.isArray(classResult.PersonResult)
                    ? classResult.PersonResult.filter(
                        (personResult) =>
                          personResult.RaceResult == null ||
                          personResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                      )
                    : classResult.PersonResult.RaceResult == null ||
                      classResult.PersonResult.RaceResult.EventRaceId ===
                        raceWizardModel.selectedEventorRaceId?.toString()
                    ? [classResult.PersonResult]
                    : [];

                  personResults.forEach((personResult) => {
                    if (personResult.Result == null && personResult.RaceResult?.Result != null) {
                      personResult.Result = personResult.RaceResult?.Result;
                    }
                  });
                  const { splitTimes, bestSplitTimes, secondBestSplitTimes } = GetSplitTimes(personResults);

                  const clubPersonResults =
                    splitTimes.length > 0
                      ? personResults.filter(
                          (personResult) =>
                            personResult.Organisation &&
                            (personResult.Organisation.OrganisationId ===
                              clubModel.eventor?.organisationId.toString() ||
                              (personResult.Organisation.OrganisationId ===
                                clubModel.eventor?.districtOrganisationId.toString() &&
                                clubModel.raceClubs?.selectedClub.competitorByEventorId(
                                  parseInt(personResult.Person.PersonId)
                                ) != null))
                        )
                      : [];

                  for (let j = 0; j < clubPersonResults.length; j++) {
                    const personResult = clubPersonResults[j];
                    let competitor: IRaceCompetitor | undefined;
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
                            clubModel.modules.find((module) => module.name === 'Results')?.addUrl,
                            personResult.Person.PersonId
                          );
                        }
                      }
                    }
                    if (!competitor) {
                      competitor = await AddMapCompetitorConfirmModal(
                        t,
                        -1,
                        personResult.Person.PersonId,
                        {
                          iType: 'COMPETITOR',
                          iFirstName: personResult.Person.PersonName.Given,
                          iLastName: personResult.Person.PersonName.Family,
                          iBirthDay: personResult.Person.BirthDate == null ? null : personResult.Person.BirthDate?.Date,
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
                        classResult.EventClass.ClassShortName,
                        clubModel
                      );
                    }

                    const didNotStart = personResult.Result?.CompetitorStatus['@attributes'].value === 'DidNotStart';
                    const misPunch = personResult.Result?.CompetitorStatus['@attributes'].value === 'MisPunch';
                    const ok = personResult.Result?.CompetitorStatus['@attributes'].value === 'OK';
                    const valid = ok && !didNotStart && !misPunch;

                    const missingTime = GetMissingTime(
                      personResult.Person?.PersonId,
                      splitTimes,
                      bestSplitTimes,
                      secondBestSplitTimes
                    );
                    const result = raceWizardModel.raceEvent?.results.find(
                      (r) =>
                        r.competitorId === competitor?.competitorId &&
                        r.competitorTime === (valid ? GetTimeWithHour(personResult.Result?.Time) : null)
                    );
                    if (
                      result &&
                      result.missingTime?.substr(-5) !== ManuallyEditedMissingTimePostfix &&
                      result.missingTime !== missingTime
                    ) {
                      result.setStringValueOrNull('missingTime', missingTime);
                    }
                  }
                }
              }
            } else if (isRelay && editResultJson) {
              for (let i = 0; i < classResults.length; i++) {
                const classResult = classResults[i];

                if (classResult.TeamResult != null) {
                  const preTeamResults = Array.isArray(classResult.TeamResult)
                    ? classResult.TeamResult.filter(
                        (teamResult) =>
                          teamResult.RaceResult == null ||
                          teamResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                      )
                    : classResult.TeamResult.RaceResult == null ||
                      classResult.TeamResult.RaceResult.EventRaceId ===
                        raceWizardModel.selectedEventorRaceId?.toString()
                    ? [classResult.TeamResult]
                    : [];

                  const teamResults: IEventorTeamResult[] = preTeamResults.map((pre) =>
                    pre.RaceResult?.TeamMemberResult != null ? pre.RaceResult : (pre as IEventorTeamResult)
                  );
                  const allLegsSplitTimes = GetRelaySplitTimes(teamResults);

                  const clubTeamMemberResults: (IEventorTeamMemberResult & {
                    Competitor?: IRaceCompetitor | null;
                    TeamName?: string;
                    TeamTime?: string;
                    TeamTimeDiff?: string;
                    TeamPosition?: number | null;
                    TeamStatus: IEventorResultStatus;
                  })[] = [];
                  teamResults.forEach((teamResult) => {
                    const teamMemberResults: IEventorTeamMemberResult[] = Array.isArray(teamResult.TeamMemberResult!)
                      ? teamResult.TeamMemberResult!
                      : [teamResult.TeamMemberResult!];
                    const teamOrganisations: IEventorOrganisation[] = Array.isArray(teamResult.Organisation!)
                      ? teamResult.Organisation!
                      : [teamResult.Organisation!];

                    const hasClubMembers = teamOrganisations.some(
                      (org) => org.OrganisationId === clubModel.eventor?.organisationId.toString()
                    );
                    const hasDistrictMembers = teamOrganisations.some(
                      (org) => org.OrganisationId === clubModel.eventor?.districtOrganisationId.toString()
                    );

                    teamMemberResults.forEach((teamMemberResult) => {
                      const competitor =
                        (hasClubMembers || hasDistrictMembers) &&
                        typeof teamMemberResult.Person.PersonId === 'string' &&
                        teamMemberResult.Person.PersonId.length > 0
                          ? clubModel.raceClubs?.selectedClub.competitorByEventorId(
                              parseInt(teamMemberResult.Person.PersonId)
                            )
                          : null;

                      if (
                        (teamMemberResult.Organisation &&
                          teamMemberResult.Organisation.OrganisationId ===
                            clubModel.raceClubs?.selectedClub.eventorOrganisationId.toString()) ||
                        competitor ||
                        (hasClubMembers && teamOrganisations.length === 1)
                      ) {
                        clubTeamMemberResults.push({
                          ...teamMemberResult,
                          Competitor: competitor,
                          TeamName: teamResult.TeamName,
                          TeamTime: teamResult.Time,
                          TeamTimeDiff: teamResult.TimeDiff,
                          TeamPosition: teamResult.ResultPosition != null ? parseInt(teamResult.ResultPosition) : null,
                          TeamStatus: teamResult.TeamStatus,
                          BibNumber:
                            teamResult.BibNumber ?? `${classResult.EventClass.ClassShortName}-${teamResult.TeamName}`,
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
                            clubModel.modules.find((module) => module.name === 'Results')?.addUrl,
                            teamMemberResult.Person.PersonId
                          );
                        }
                      }
                    }
                    if (!competitor) {
                      competitor = await AddMapCompetitorConfirmModal(
                        t,
                        -1,
                        teamMemberResult.Person.PersonId,
                        {
                          iType: 'COMPETITOR',
                          iFirstName: teamMemberResult.Person.PersonName.Given,
                          iLastName: teamMemberResult.Person.PersonName.Family,
                          iBirthDay:
                            teamMemberResult.Person.BirthDate == null ? null : teamMemberResult.Person.BirthDate?.Date,
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
                        classResult.EventClass.ClassShortName,
                        clubModel
                      );
                    }

                    const didNotStart = teamMemberResult.CompetitorStatus['@attributes'].value === 'DidNotStart';
                    const misPunch = teamMemberResult.CompetitorStatus['@attributes'].value === 'MisPunch';
                    const ok = teamMemberResult.CompetitorStatus['@attributes'].value === 'OK';
                    const valid = ok && !didNotStart && !misPunch;
                    const legSplitTimes = allLegsSplitTimes.find((lst) => lst.leg === teamMemberResult.Leg);
                    const missingTime =
                      legSplitTimes &&
                      GetMissingTime(
                        teamMemberResult.Person.PersonId,
                        legSplitTimes.splitTimes,
                        legSplitTimes.bestSplitTimes,
                        legSplitTimes.secondBestSplitTimes
                      );
                    const result = raceWizardModel.raceEvent?.teamResults.find(
                      (r) =>
                        r.competitorId === competitor?.competitorId &&
                        r.competitorTime === (valid ? GetTimeWithHour(teamMemberResult.Time) : null)
                    );
                    if (
                      result &&
                      result.missingTime?.substr(-5) !== ManuallyEditedMissingTimePostfix &&
                      result.missingTime !== missingTime
                    ) {
                      result.setStringValueOrNull('missingTime', missingTime);
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

    useEffect(() => {
      load().then();
    }, []);

    return total > 0 ? (
      <SpinnerDiv>
        <Progress type="circle" percent={(100 * processed) / total} />
        <div>{currentEvent}</div>
      </SpinnerDiv>
    ) : (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    );
  }
);

export default ResultWizardStep1ChooseRaceRerun;
