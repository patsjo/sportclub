interface IEventorAlternativeDate {
  Sequence: string;
  FinishDate: IEventorDateTime;
  StartDate: IEventorDateTime;
}
interface IEventorCCard {
  CCardId: string;
  PunchingUnitType: IEventorPunchingUnitType;
}

export interface IEventorEventClass {
  EventClassId: string;
  '@attributes': {
    allowEntryInAdvance: 'Y' | 'N';
    numberInTeam: string;
    numberOfEntries: string;
    noOfStarts?: string;
    numberOfLegs: string;
    sequence: string;
    sex: 'F' | 'M';
    teamEntry: 'Y' | 'N';
    timePresentation: 'Y' | 'N';
  };
  BaseClassId?: string;
  ClassEntryFee?: IEventorEntryClassFee[] | IEventorEntryClassFee;
  ClassRaceInfo: IEventorEventClassRaceInfo[] | IEventorEventClassRaceInfo;
  ClassShortName: string;
  ClassType?: { ClassTypeId: string; ShortName: 'T'; Name: string };
  EventClassStatus: { '@attributes': { value: 'normal' } };
  ExternalId: string;
  Name: string;
  PunchingUnitType: IEventorPunchingUnitType;
}

export interface IEventorEventClasses {
  EventClass: IEventorEventClass[] | IEventorEventClass;
}

export interface IEventorClassResult {
  '@attributes': { numberOfEntries: string; numberOfStarts: string };
  EventClass: IEventorEventClass;
  PersonResult?: IEventorPersonResult[] | IEventorPersonResult;
  TeamResult?: (IEventorTeamResult | IEventorTeamResultRace)[] | IEventorTeamResult | IEventorTeamResultRace;
}

interface IEventorStart {
  BibNumber: string;
  StartId?: string;
  CCardId: string;
  ModifyDate: IEventorDateTime;
  StartTime: IEventorDateTime;
}

export interface IEventorClassPersonStart {
  Organisation: IEventorOrganisation;
  Person: IEventorPerson;
  Start?: IEventorStart;
  RaceStart?: { Start?: IEventorStart };
}

export interface IEventorClassTeamStart {
  BibNumber: string;
  TeamName: string;
  StartTime: IEventorDateTime;
}

export interface IEventorClassStart {
  EventClassId: string;
  PersonStart: IEventorClassPersonStart;
  TeamStart?: IEventorClassTeamStart;
}

interface IEventorEventClassRaceInfo {
  ClassRaceInfoId: string;
  '@attributes': { minRunners: string; maxRunners: string; noOfEntries: string; noOfStarts: string; relayLeg?: string };
  ClassRaceStatus?: { '@attributes': { value: 'notAllocated' } };
  EventRaceId: string;
  Name: any;
  PunchingUnitType: IEventorPunchingUnitType;
}

export interface IEventorEventClasses {
  EventClass: IEventorEventClass[] | IEventorEventClass;
}

export interface IEventorCompetitor {
  CompetitorId: string;
  CCard: IEventorCCard;
  DisciplineId?: string;
  ModifiedBy?: IEventorCreatedBy;
  ModifyDate?: IEventorDateTime;
  Organisation?: IEventorOrganisation;
  Person?: IEventorPerson;
  PersonId?: string;
  EntryClass?: IEventorEntryClass;
  Result?: IEventorResult;
}

export interface IEventorCompetitors {
  Competitor: IEventorCompetitor[] | IEventorCompetitor;
}

export interface IEventorCompetitorResult {
  ResultList: IEventorResults[] | IEventorResults;
}

interface IEventorCreatedBy {
  PersonId: string;
}

interface IEventorDate {
  Date: string;
}

interface IEventorDateTime {
  Date: string;
  Clock: string;
}

export interface IEventorEntries {
  Entry: IEventorEntry[] | IEventorEntry;
}

export interface IEventorEntry {
  BibNumber: any;
  Competitor: IEventorCompetitor;
  CreatedBy: IEventorCreatedBy;
  EntryClass: IEventorEntryClass;
  EntryDate: IEventorDateTime;
  EntryEntryFee?: IEventorEntryClassFee[] | IEventorEntryClassFee;
  EntryId: string;
  Event: IEventorEvent;
  EventRaceId: string;
  ModifiedBy: IEventorCreatedBy;
  ModifyDate: IEventorDateTime;
}

interface IEventorEntryClass {
  EventClassId: string;
  '@attributes': {
    sequence: string;
  };
  ClassShortName?: string;
  numberOfStarts?: number | null;
}

export interface IEventorEntryClassFee {
  EntryFeeId: string;
  Sequence: string;
  '@attributes': {
    isWholeEventFee: 'false' | 'true';
  };
}

export interface IEventorEntryFee {
  EntryFeeId: string;
  '@attributes': {
    taxIncluded: 'Y' | 'N';
    valueOperator?: 'fixed' | 'percent';
    entryFeeType: 'elite' | 'adult' | 'youth';
    type: 'elite' | 'adult' | 'youth';
  };
  Amount: string;
  ExternalFee: string;
  Name: string;
  ValidFromDate?: IEventorDateTime;
  ValidToDate: IEventorDateTime;
  FromDateOfBirth?: IEventorDate;
  ToDateOfBirth?: IEventorDate;
}

export interface IEventorEntryFees {
  EntryFee: IEventorEntryFee[] | IEventorEntryFee;
}

export interface IEventorEvent {
  EventId: string;
  '@attributes': {
    eventForm: 'IndSingleDay' | 'IndMultiDay' | 'RelaySingleDay' | 'RelayMultiDay';
  };
  Name: string;
  EventClassificationId: string;
  EventStatusId: string;
  StartDate: IEventorDateTime;
  FinishDate: IEventorDateTime;
  EntryBreak?:
    | {
        ValidFromDate?: IEventorDateTime;
        ValidToDate: IEventorDateTime;
      }[]
    | {
        ValidFromDate?: IEventorDateTime;
        ValidToDate: IEventorDateTime;
      };
  EventRace: IEventorEventRace[] | IEventorEventRace;
  WebURL: string;
  Organiser?:
    | { OrganisationId: string | string[]; Organisation: undefined }
    | { Organisation: IEventorOrganisation[] | IEventorOrganisation };
  PunchingUnitType: IEventorPunchingUnitType;
  ModifyDate: IEventorDateTime;
  ModifiedBy: IEventorCreatedBy;
  AlternativeDates?: IEventorAlternativeDate[] | IEventorAlternativeDate;
  ClassTypeId?: string[] | string;
  DisciplineId?: string;
  EventAttributeId?: string;
  HashTableEntry?: any;
}

export interface IEventorEvents {
  Event?: IEventorEvent[] | IEventorEvent;
}

export interface IEventorEventRace {
  EventRaceId: string;
  '@attributes': {
    raceLightCondition: 'Day' | 'Night';
    raceDistance: 'Long' | 'Middle' | 'Sprint';
  };
  EventId: string;
  Name: any;
  RaceDate: IEventorDateTime;
  EventCenterPosition: IEventorPosition;
}

export interface IEventorOrganisation {
  OrganisationId: string;
  Name: string;
  ShortName: string;
  MediaName: string;
  OrganisationTypeId: '1' | '2' | '3';
  CountryId: {
    '@attributes': {
      value: string;
    };
  };
  ParentOrganisation: {
    OrganisationId: string;
  };
  ModifyDate: IEventorDateTime;
}

interface IEventorPerson {
  PersonId: string;
  PersonName: { Family: string; Given: string };
  '@attributes': {
    sex: 'F' | 'M';
  };
  BirthDate: IEventorDate;
  Nationality: {
    CountryId: {
      '@attributes': {
        value: string;
      };
    };
  };
  OrganisationId: string;
  ModifyDate: IEventorDateTime;
}

export interface IEventorPersonResult {
  Organisation: IEventorOrganisation;
  Person: IEventorPerson;
  Result?: IEventorResult;
  RaceResult?: IEventorRaceResult;
}

interface IEventorPosition {
  '@attributes': {
    x: string;
    y: string;
    unit: 'WGS-84';
  };
}

interface IEventorPunchingUnitType {
  '@attributes': {
    value: 'SI' | 'Emit';
  };
}

interface IEventorRaceResult {
  EventRaceId: string;
  Result?: IEventorResult;
}

interface IEventorResult {
  ResultId: string;
  BibNumber: string;
  CCardId: string;
  CompetitorStatus: IEventorResultStatus;
  FinishTime: IEventorDateTime;
  ModifyDate: IEventorDateTime;
  ResultPosition: string;
  SplitTime: IEventorSplitTime[] | IEventorSplitTime;
  StartTime: IEventorDateTime;
  Time: string;
  TimeDiff: string;
}

export interface IEventorResultStatus {
  '@attributes': { value: 'OK' | 'DidNotStart' | 'MisPunch' };
}

export interface IEventorResults {
  '@attributes'?: { status: 'snapshot' };
  ClassResult: IEventorClassResult[] | IEventorClassResult;
  Event: IEventorEvent;
}

export interface IEventorSplitTime {
  '@attributes': { sequence: string };
  ControlCode: string;
  Time: string;
}

export interface IEventorStarts {
  ClassStart: IEventorClassStart[] | IEventorClassStart;
  Event: IEventorEvent;
}

export interface IEventorTeamMemberResult {
  BibNumber?: string;
  CompetitorStatus: IEventorResultStatus;
  FinishTime: IEventorDateTime;
  Leg: string;
  LegOrder: string;
  OverallResult?: { Time: string; TimeDiff?: string; ResultPosition: string; TeamStatus: IEventorResultStatus };
  Organisation?: IEventorOrganisation;
  Person: IEventorPerson;
  Position?: string;
  SplitTime: IEventorSplitTime[] | IEventorSplitTime;
  StartTime: IEventorDateTime;
  Time: string;
  TimeBehind: string;
}

export interface IEventorTeamResult {
  BibNumber?: string;
  FinishTime: IEventorDateTime;
  Organisation: IEventorOrganisation[] | IEventorOrganisation;
  ResultPosition?: string;
  StartTime: IEventorDateTime;
  TeamMemberResult: IEventorTeamMemberResult[] | IEventorTeamMemberResult;
  TeamName: string;
  TeamStatus: IEventorResultStatus;
  Time: string;
  TimeDiff?: string;
  RaceResult: undefined;
}

export interface IEventorTeamResultRace {
  RaceResult: IEventorTeamResult & { EventRaceId: string };
  Organisation: undefined;
  TeamMemberResult: undefined;
}
