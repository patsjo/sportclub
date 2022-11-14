// XSD to typescript converter:
// https://github.com/charto/cxsd
// Source file:
// https://github.com/international-orienteering-federation/datastandard-v3/blob/master/IOF.xsd

//TODO: fix missing attributes from PHP

import moment from 'moment';

/** The bank account of an organisation or an event. */
type IAccount = string;

/** The postal address of a person or organisation. */
interface IAddress {
  '@attributes': {
    modifyTime?: string;
    /** The address type, e.g. visitor address or invoice address. */
    type?: string;
  };
  CareOf?: string;
  City?: string;
  Country?: ICountry;
  State?: string;
  Street?: string;
  ZipCode?: string;
}

/** Defines a monetary amount. */
type IAmount = number;

/** Contains information about a fee that has been assigned to a competitor or a team, and the amount that has been paid. */
interface IAssignedFee {
  '@attributes': {
    modifyTime?: string;
  };

  /** The fee that has been assigned to the competitor or the team. */
  Fee: IFee;
  /** The amount that has been paid, optionally including currency code. */
  PaidAmount?: IAmount;
}

/** The base message element that all message elements extend. */
interface IBaseMessageElement {
  '@attributes': {
    /** The time when the file was created. */
    createTime?: string;
    /** The name of the software that created the file. */
    creator?: string;
    /** The version of the IOF Interface Standard that the file conforms to. */
    iofVersion: string;
  };
}

/** Defines a class in an event. */
interface IClass {
  '@attributes': {
    /** The highest allowed age for a competitor taking part in the class. */
    maxAge?: number;
    /** The maximum number of competitors that are allowed to take part in the class. A competitor corresponds to a person (if an individual event) or a team (if a team or relay event). If the maximum number of competitors varies between races in a multi-day event, use the maxNumberOfCompetitors attribute in the RaceClass element. */
    maxNumberOfCompetitors?: number;
    /** The maximum number of members in a team taking part in the class, if the class is a team class. */
    maxNumberOfTeamMembers?: number;
    /** The highest allowed age sum of the team members for a team taking part in the class. */
    maxTeamAge?: number;
    /** The lowest allowed age for a competitor taking part in the class. */
    minAge?: number;
    /** The minimum number of members in a team taking part in the class, if the class is a team class. */
    minNumberOfTeamMembers?: number;
    /** The lowest allowed age sum of the team members for a team taking part in the class. */
    minTeamAge?: number;
    modifyTime?: string;
    /** The number of competitors in the class. A competitor corresponds to a person (if an individual event) or a team (if a team or relay event). */
    numberOfCompetitors?: number;
    /** Defines the kind of information to include in the result list, and how to sort it. For example, the result list of a beginner's class may include just "finished" or "did not finish" instead of the actual times. */
    resultListMode?: ClassResultListModeType;
    sex?: ClassSexType;
  };

  /** The class type(s) for the class. */
  ClassType?: IClassType[];
  /** The entry fees for an individual competitor taking part in the class. Use the TeamFee element to specify a fee for the team as a whole. Use the Fee subelement of the RaceClass element to specify a fee on race level. */
  Fee?: IFee[];
  Id?: IId;
  /** Information about the legs, if the class is a relay class. One Leg element per leg must be present. */
  Leg?: ILeg[];
  /** The name of the class. */
  Name: string;
  /** Race-specific information for the class, e.g. course(s) assigned to the class. */
  RaceClass?: IRaceClass[];
  /** The abbreviated name of a class, used when space is limited. */
  ShortName?: string;
  /** The overall status of the class, e.g. if overall results should be considered invalid due to misplaced controls. */
  Status?: EventClassStatus;
  /** The entry fees for a team as a whole taking part in this class. Use the Fee element to specify a fee for an individual competitor in the team. Use the TeamFee subelement of the RaceClass element to specify a fee on race level. */
  TeamFee?: IFee[];
  /** The class that competitors in this class should be transferred to if there are too few entries in this class. */
  TooFewEntriesSubstituteClass?: IClass;
  /** The class that competitors that are not qualified (e.g. due to too low ranking) should be transferred to if there are too many entries in this class. */
  TooManyEntriesSubstituteClass?: IClass;
}

/** Element that connects a course with a class. Courses should be present in the RaceCourseData element and are matched on course name and/or course family. Classes are matched by 1) Id, 2) Name. */
interface IClassCourseAssignment {
  '@attributes': {
    /** The number of competitors in the class. A competitor corresponds to a person (if an individual event) or a team (if a team or relay event). */
    numberOfCompetitors?: number;
  };

  /** The legs that the course can be assigned to in a relay class. This element can be omitted for individual classes. */
  AllowedOnLeg?: number[];
  /** The id of the class. */
  ClassId?: IId;
  /** The name of the class. */
  ClassName: string;
  /** The family or group of forked courses that the course is part of. */
  CourseFamily?: string;
  /** The name of the course. */
  CourseName?: string;
}

interface IClassListType extends IBaseMessageElement {
  Class?: IClass[];
}

/** The result list for a single class containing either individual results or team results. */
interface IClassResult {
  '@attributes': {
    modifyTime?: string;
    /** The time resolution of the results, normally 1. For tenths of a second, use 0.1. */
    timeResolution?: number;
  };

  /** The class that the result list belongs to. */
  Class: IClass;
  /** Defines the course assigned to the class. If courses are unique per competitor, use PersonResult/Course or TeamResult/TeamMemberResult/Course instead. One element per race. */
  Course?: ISimpleRaceCourse[];
  /** Results for individual competitors in the class. */
  PersonResult?: IPersonResult[];
  /** Results for teams in the class. */
  TeamResult?: ITeamResult[];
}

type ClassResultListModeType = 'Default' | 'Unordered' | 'UnorderedNoTimes';
type ClassSexType = 'B' | 'F' | 'M';

/** The start list of a single class containing either individual start times or team start times. */
interface IClassStart {
  '@attributes': {
    modifyTime?: string;
    /** The time resolution of the start times, normally 1. For tenths of a second, use 0.1. */
    timeResolution?: number;
  };

  /** The class that the start list belongs to. */
  Class: IClass;
  /** Defines the course assigned to the class. If courses are unique per competitor, use PersonStart/Course or TeamStart/TeamMemberStart/Course instead. One element per race. */
  Course?: ISimpleRaceCourse[];
  /** Start times for individual competitors in the class. */
  PersonStart?: IPersonStart[];
  /** Defines the name of the start place (e.g. Start 1), if the race has multiple start places. One element per race. */
  StartName?: IStartName[];
  /** Start times for teams in the class. */
  TeamStart?: ITeamStart[];
}

/** Defines a class type, which is used to group classes in categories. */
interface IClassType {
  '@attributes': {
    modifyTime?: string;
  };

  Id?: IId;
  /** The name of the class type. */
  Name: string;
}

/** Represents information about a person in a competition context, i.e. including organisation and control card. */
interface ICompetitor {
  '@attributes': {
    modifyTime?: string;
  };

  /** The default classes of the competitor. */
  Class?: IClass[];
  /** The default control cards of the competitor. */
  ControlCard?: IControlCard[];
  /** The organisations that the person is member of. */
  Organisation?: IOrganisation[];
  Person: IPerson;
  /** Any scores, e.g. ranking scores, for the person. */
  Score?: IScore[];
}

interface ICompetitorListType extends IBaseMessageElement {
  Competitor?: ICompetitor[];
}

/** Contact information for a person, organisation or other entity. */
type IContact = string;

type ContactTypeType = 'PhoneNumber' | 'MobilePhoneNumber' | 'FaxNumber' | 'EmailAddress' | 'WebAddress' | 'Other';

/** Defines a control, without any relationship to a particular course. */
interface IControl {
  '@attributes': {
    modifyTime?: string;
    /** The type of the control: (ordinary) control, start, finish, crossing point or end of marked route. This attribute can be overridden on the CourseControl level. */
    type?: ControlType;
  };

  /** The code of the control. */
  Id?: IId;
  /** The position of the control according to tha map's coordinate system. */
  MapPosition?: IMapPosition;
  /** The name of the control, used for e.g. online controls ('spectator control', 'prewarning'). */
  Name?: ILanguageString[];
  /** The geographical position of the control. */
  Position?: IGeoPosition;
  /** If the control has multiple punching units with separate codes, specify all these codes using elements of this kind. Omit this element if there is a single punching unit whose code is the same as the control code. */
  PunchingUnitId?: IId[];
}

/** Defines the the selected answer, the correct answer and the time used on a Trail-O control. */
interface IControlAnswer {
  /** The answer that the competitor selected. If the competitor did not give any answer, use an empty string. */
  Answer: string;
  /** The correct answer. If no answer is correct, use an empty string. */
  CorrectAnswer: string;
  /** The time in seconds used to give the answer, in case of a timed control. Fractions of seconds (e.g. 258.7) may be used if the time resolution is higher than one second. */
  Time?: number;
}

/** The unique identifier of the control card, i.e. card number. */
type IControlCard = string;

interface IControlCardListType extends IBaseMessageElement {
  /** The control cards. */
  ControlCard: IControlCard[];
  /** The owner of the control cards. */
  Owner?: string;
}

/** The type of a control: (ordinary) control, start, finish, crossing point or end of marked route. */
export type ControlType = 'Control' | 'Start' | 'Finish' | 'CrossingPoint' | 'EndOfMarkedRoute';

/** Defines the name of the country. */
type ICountry = string;

/** Defines a course, i.e. a number of controls including start and finish. */
interface ICourse {
  '@attributes': {
    modifyTime?: string;
    /** The number of competitors that this course has been assigned to. */
    numberOfCompetitors?: number;
  };

  /** The climb of the course, in meters, along the expected best route choice. */
  Climb?: number;
  /** The controls, including start and finish, that the course is made up of. */
  CourseControl: ICourseControl[];
  /** The family or group of forked courses that the course is part of. */
  CourseFamily?: string;
  Id?: IId;
  /** The length of the course, in meters. */
  Length?: number;
  /** The id of the map used for this course. */
  MapId?: number;
  /** The name of the course. */
  Name: string;
}

/** A control included in a particular course. */
interface ICourseControl {
  '@attributes': {
    modifyTime?: string;
    /** Non-broken sequences of course controls having randomOrder set to true can be visited in an arbitrary order. */
    randomOrder?: boolean;
    /** Any special instruction applied at the control, see the column G as defined in International Specification for Control Descriptions. */
    specialInstruction?: CourseControlSpecialInstructionType;
    /** The length of the taped route in meters. Only to be specified if specialInstruction is TapedRoute or FunnelTapedRoute and if different from the value specified in LegLength element, i.e. when Special Instruction 13.1 is used. */
    tapedRouteLength?: number;
    /** The type of the control: (ordinary) control, start, finish, crossing point or end of marked route. If this attribute is specified, it overrides the corresponding Control's type. */
    type?: ControlType;
  };

  /** The code(s) of the control(s), without course-specific information. Specifying multiple control codes means that the competitor is required to punch one of the controls, but not all of them. */
  Control: string[];
  /** The length in meters from the previous control on the course. For starts, this length may refer to the distance from the time start to the start flag. */
  LegLength?: number;
  /** Indicates the text shown next to the control circle, i.e. the control number. */
  MapText?: string;
  /** Indicates the position of the center of the text relative to the center of the control circle. */
  MapTextPosition?: IMapPosition;
  /** The score of the control in score-O events. */
  Score?: number;
}

type CourseControlSpecialInstructionType =
  | 'None'
  | 'TapedRoute'
  | 'FunnelTapedRoute'
  | 'MandatoryCrossingPoint'
  | 'MandatoryOutOfBoundsAreaPassage';

interface ICourseDataType extends IBaseMessageElement {
  /** The event that the course data belongs to. */
  Event: IEvent;
  /** The course data for each race; one element per race in the event. */
  RaceCourseData: IRaceCourseData[];
}

/** Defines a point in time which either is known by date and time, or just by date. May be used for event dates, when the event date is decided before the time of the first start. */
export interface IDateAndOptionalTime {
  /** The date part, expressed in ISO 8601 format. */
  Date: string;
  /** The time part, expressed in ISO 8601 format. */
  Time?: string;
}

interface IEntryListType extends IBaseMessageElement {
  /** The event that the entry list belongs to. */
  Event: IEvent;
  /** The individual competitors registered for the event. */
  PersonEntry?: IPersonEntry[];
  /** The teams registered for the event. */
  TeamEntry?: ITeamEntry[];
}

interface IEntryReceiver {
  Address?: IAddress[];
  Contact?: IContact[];
}

interface IEvent {
  modifyTime?: string;
  /** The bank account for the event. */
  Account?: IAccount[];
  /** The classes that are available at the event. */
  Class?: IClass[];
  /** The classification or level of the event. If the event is a multi-race event, and classification is set per race, use the Classification element of the Race element. */
  Classification?: EventClassification;
  /** The expected finish time for the last finishing competitor of the event. If the event contains multiple races, this is the expected finish time for the last finishing competitor of the last race. */
  EndTime?: IDateAndOptionalTime;
  /** Address and contact information to the person or organisation which registers the entries for the event. */
  EntryReceiver?: IEntryReceiver;
  Form?: EventForm[];
  Id?: IId;
  /** Presents arbitrary data about the event, e.g. "Accommodation", "Local Attractions", and so on. Information present here should be defined well in advance of the event, in contrast to the 'News' element. */
  Information?: IInformationItem[];
  Name: string;
  /** Presents "last minute information" about the event. */
  News?: IInformationItem[];
  /** The main officials of the event, e.g. course setter and event president. */
  Official?: IRole[];
  /** The organisations that organise the event. */
  Organiser?: IOrganisation[];
  /** An event consists of a number of races. The number is equal to the number of times a competitor should start. Most events contain a single race, and this elemend could then be omitted. */
  Race?: IRace[];
  /** Defines the schedule of events that comprise the entire orienteering event, e.g. entry deadlines, banquet and social events, and awards ceremonies. */
  Schedule?: ISchedule[];
  /** The services available for the event, e.g. accomodation and transport. */
  Service?: IService[];
  /** The start time for the first starting competitor of the event. If the event contains multiple races, this is the start time for the first starting competitor of the first race. */
  StartTime?: IDateAndOptionalTime;
  /** The status of the event. If the event is a multi-race event, and status is set per race, use the Status element of the Race element. */
  Status?: EventStatus;
  /** URLs to various types of additional information regarding the event, e.g. event website or result list. */
  URL?: IEventURL[];
}

export type EventClassification = 'International' | 'National' | 'Regional' | 'Local' | 'Club';

/** The status of the class. */
export type EventClassStatus = 'Normal' | 'Divided' | 'Joined' | 'Invalidated' | 'InvalidatedNoFee';

export type EventForm = 'Individual' | 'Team' | 'Relay';

interface IEventListType extends IBaseMessageElement {
  Event?: IEvent[];
}

export type EventStatus = 'Planned' | 'Applied' | 'Proposed' | 'Sanctioned' | 'Canceled' | 'Rescheduled';

type IEventURL = string;

type EventURLTypeType = 'Website' | 'StartList' | 'ResultList' | 'Other';

/** A fee that applies when entering a class at a race or ordering a service. */
interface IFee {
  '@attributes': {
    modifyTime?: string;
    /** The type of fee. */
    type?: FeeTypeType;
  };

  /** The fee amount, optionally including currency code. This element must not be present if a Percentage element exists. */
  Amount?: IAmount;
  /** The start of the birth date interval that the fee should be applied to. Omit if no lower birth date restriction. */
  FromDateOfBirth?: moment.Moment;
  Id?: IId;
  /** A describing name of the fee, e.g. 'Late entry fee'. */
  Name: ILanguageString[];
  /** The percentage to increase or decrease already existing fees in a fee list with. This element must not be present if an Amount element exists. */
  Percentage?: number;
  /** The fee amount that is taxable, i.e. considered when calculating taxes for an event. This element must not be present if a Percentage element exists, or if an Amount element does not exist. */
  TaxableAmount?: IAmount;
  /** The percentage to increase or decrease already existing taxable fees in a fee list with. This element must not be present if an Amount element exists, or if a Percentage element does not exist. */
  TaxablePercentage?: number;
  /** The end of the birth date interval that the fee should be applied to. Omit if no upper birth date restriction. */
  ToDateOfBirth?: moment.Moment;
  /** The time when the fee takes effect. */
  ValidFromTime?: moment.Moment;
  /** The time when the fee expires. */
  ValidToTime?: moment.Moment;
}

type FeeTypeType = 'Normal' | 'Late';

/** Defines a geographical position, e.g. of a control. */
interface IGeoPosition {
  '@attributes': {
    /** The altitude (elevation above sea level), in meters. */
    alt?: number;
    /** The latitude. */
    lat: number;
    /** The longitude. */
    lng: number;
  };
}

/** Identifier element, used extensively. The id should be known and common for both systems taking part in the data exchange. */
type IId = string;

type IImage = string;

/** Defines a general-purpose information object containing a title and content. */
interface IInformationItem {
  '@attributes': {
    modifyTime?: string;
  };

  /** The information in detailed form. */
  Content: string;
  /** A short summary of the information. */
  Title: string;
}

/** Defines a text that is given in a particular language. */
/** The ISO 639-1 two-letter code of the language as stated in https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes. */
type ILanguageString = string;

/** Defines extra information for a relay leg. */
interface ILeg {
  '@attributes': {
    /** The maximum number of competitors in case of a parallel leg. */
    maxNumberOfCompetitors?: number;
    /** The minimum number of competitors in case of a parallel leg. */
    minNumberOfCompetitors?: number;
  };

  /** The name of the leg, if not sequentially named. */
  Name?: string;
}

/** Map information, used in course setting software with regard to the "real" map. */
interface IMap {
  Id?: IId;
  /** The map image. */
  Image?: IImage;
  /** The position of the map's bottom right corner given in the map's coordinate system. */
  MapPositionBottomRight: IMapPosition;
  /** The position of the map's top left corner given in the map's coordinate system, usually (0, 0). */
  MapPositionTopLeft: IMapPosition;
  /** The denominator of the scale of the map. 1:15000 should be represented as 15000. */
  Scale: number;
}

/** Defines a position in a map's coordinate system. */
interface IMapPosition {
  /** The type of unit used. */
  unit?: MapPositionUnitType;
  /** The number of units right of the center of the coordinate system. */
  x: number;
  /** The number of units below the center of the coordinate system. */
  y: number;
}

type MapPositionUnitType = 'px' | 'mm';

/** Information about an organisation, i.e. address, contact person(s) etc. An organisation is a general term including federations, clubs, etc. */
interface IOrganisation {
  '@attributes': {
    modifyTime?: string;
    /** The hierarchical level or type of an organisation. */
    type?: OrganisationTypeType;
  };

  Account?: IAccount[];
  Address?: IAddress[];
  Contact?: IContact[];
  Country?: ICountry;
  Id?: IId;
  /** The logotype for the organisation. Multiple logotypes may be included; in this case, make sure to include width and height attributes. */
  Logotype?: IImage[];
  /** The name of the organisation as appearing in result lists targeted to media. */
  MediaName?: string;
  /** The full name of the organisation. */
  Name: string;
  /** The id of the parent of this organisation, e.g. a regional organisation for a club. */
  ParentOrganisationId?: number;
  /** The geographical location of the organisation, e.g. a city center, an office or a club house. */
  Position?: IGeoPosition;
  /** Persons having certain roles within the organisation, e.g. chairman, secretary, and treasurer. */
  Role?: IRole[];
  /** The short (abbreviated) name of the organisation. */
  ShortName?: string;
}

interface IOrganisationListType extends IBaseMessageElement {
  Organisation?: IOrganisation[];
}

/** Service requests made by an organisation. */
interface IOrganisationServiceRequest {
  /** The organisation that made the requests. */
  Organisation: IOrganisation;
  /** The service requests made by persons representing the organisation. */
  PersonServiceRequest?: IPersonServiceRequest[];
  /** The service requests that the organisation made. */
  ServiceRequest?: IServiceRequest[];
}

type OrganisationTypeType =
  | 'IOF'
  | 'IOFRegion'
  | 'NationalFederation'
  | 'NationalRegion'
  | 'Club'
  | 'School'
  | 'Company'
  | 'Military'
  | 'Other';

interface IOverallResult {
  /** The position in the result list for the person or team that the result belongs to. This element should only be present when the Status element is set to OK. */
  Position?: number;
  /** Any scores that are attached to the result, e.g. World Ranking points. */
  Score?: IScore[];
  /** The status of the result. */
  Status: ResultStatus;
  /** The time, in seconds, that is shown in the result list. Fractions of seconds (e.g. 258.7) may be used if the time resolution is higher than one second. */
  Time?: number;
  /** The time, in seconds, that the the person or team is behind the leader or winner. Fractions of seconds (e.g. 258.7) may be used if the time resolution is higher than one second. */
  TimeBehind?: number;
}

/** Represents a person. This could either be a competitor (see the Competitor element) or contact persons in an organisation (see the Organisation element). */
export interface IPerson {
  '@attributes': {
    modifyTime?: string;
    sex?: PersonSexType;
  };

  Address?: IAddress[];
  /** The date when the person was born, expressed in ISO 8601 format. */
  BirthDate?: moment.Moment;
  Contact?: IContact[];
  /** The identifier of the person. Multiple identifiers can be included, e.g. when there is both a World Ranking Event identifier and a national database identifier for the person. */
  Id?: IId[];
  Name: IPersonName;
  Nationality?: ICountry;
}

/** Element that connects a course with an individual competitor. Courses should be present in the RaceCourseData element and are matched on course name and/or course family. Persons are matched by 1) BibNumber, 2) EntryId. */
interface IPersonCourseAssignment {
  /** The bib number of the person. */
  BibNumber?: string;
  /** The name of the class that the person belongs to. */
  ClassName?: string;
  /** The family or group of forked courses that the course is part of. */
  CourseFamily?: string;
  /** The name of the course. */
  CourseName?: string;
  /** The id corresponding to this person's entry in an EntryList. */
  EntryId?: IId;
  /** The name of the person. */
  PersonName?: string;
}

/** Defines an event entry for a person. */
interface IPersonEntry {
  '@attributes': {
    modifyTime?: string;
  };

  /** The fees that the person has to pay when entering the event. In a multi-race event, there is usually one element for each race. */
  AssignedFee?: IAssignedFee[];
  /** The class(es) the person wants to take part in. Multiple classes may be provided in order of preference in scenarios where the number of competitors are limited in some classes. */
  Class?: IClass[];
  /** Information about the control cards (punching cards) that the person uses at the event. Multiple control cards can be specified, e.g. one for punch checking and another for timing. */
  ControlCard?: IControlCard[];
  /** The time when the entry was first submitted. */
  EntryTime?: moment.Moment;
  Id?: IId;
  /** The organisation that the person represents at the event. */
  Organisation?: IOrganisation;
  /** The person that is entered. */
  Person: IPerson;
  /** The ordinal numbers of the races that the person is taking part in, starting at 1. If not specified, the person takes part in all races. */
  RaceNumber?: number[];
  /** Any score that is submitted together with the entry, e.g. World Ranking points. */
  Score?: IScore[];
  /** Defines the services requested by the person. */
  ServiceRequest?: IServiceRequest[];
  /** Any special preferences regarding start time that has to be taken into consideration when making the start list draw. */
  StartTimeAllocationRequest?: IStartTimeAllocationRequest;
}

interface IPersonName {
  Family: string;
  Given: string;
}

/** Result information for a person in a race. */
export interface IPersonRaceResult {
  '@attributes': {
    /** The ordinal number of the race that the information belongs to for a multi-race event, starting at 1. */
    raceNumber?: number;
  };

  /** Defines the fees that the person has been assigned. */
  AssignedFee?: IAssignedFee[];
  /** The bib number that the person that the result belongs to is wearing. */
  BibNumber?: string;
  /** Defines the answer for a trail-O control. */
  ControlAnswer?: IControlAnswer[];
  /** Defines the control card assigned to the person. Multiple control cards can be specified, e.g. one for punch checking and another for timing. */
  ControlCard?: IControlCard[];
  /** Defines the course assigned to the person. */
  Course?: ISimpleCourse;
  /** The time when the person that the result belongs to finished, expressed in ISO 8601 format. */
  FinishTime?: moment.Moment;
  /** Holds the overall result for the person after the current race for a multi-race event. */
  OverallResult?: IOverallResult;
  /** The position in the result list for the person that the result belongs to. This element should only be present when the Status element is set to OK. */
  Position?: number;
  /** Defines the person's route recorded by a tracking device. */
  Route?: string;
  /** Any scores that are attached to the result, e.g. World Ranking points. */
  Score?: IScore[];
  /** Defines the services requested by the person. */
  ServiceRequest?: IServiceRequest[];
  /** Contains the times at each control of the course. Each control of the competitor's course (if known) has to be defined in a SplitTime element, even if the control has not been punched or if the competitor has not started. Start and finish times must not be present as SplitTime elements. */
  SplitTime?: ISplitTime[];
  /** The time when the person that the result belongs to started, expressed in ISO 8601 format. */
  StartTime?: moment.Moment;
  /** The status of the result. */
  Status: ResultStatus;
  /** The time, in seconds, that is shown in the result list. Fractions of seconds (e.g. 258.7) may be used if the time resolution is higher than one second. */
  Time?: number;
  /** The time, in seconds, that the the person is behind the winner. Fractions of seconds (e.g. 258.7) may be used if the time resolution is higher than one second. */
  TimeBehind?: number;
}

/** Start information for a person in a race. */
interface IPersonRaceStart {
  '@attributes': {
    /** The ordinal number of the race that the information belongs to for a multi-race event, starting at 1. */
    raceNumber?: number;
  };

  /** Defines the fees that the person has been assigned. */
  AssignedFee?: IAssignedFee[];
  /** The bib number that the person is wearing. */
  BibNumber?: string;
  /** Defines the control cards assigned to the person. Multiple control cards can be specified, e.g. one for punch checking and another for timing. */
  ControlCard?: IControlCard[];
  /** Defines the course assigned to the person. */
  Course?: ISimpleCourse;
  /** Defines the services requested by the person. */
  ServiceRequest?: IServiceRequest[];
  /** The time when the person starts. */
  StartTime?: moment.Moment;
}

/** Result information for an individual competitor, including e.g. result status, place, finish time, and split times. */
export interface IPersonResult {
  '@attributes': {
    modifyTime?: string;
  };

  /** The id corresponding to this person's entry in an EntryList. */
  EntryId?: IId;
  /** The organisation that the person is representing at the event. */
  Organisation?: IOrganisation;
  /** The person that the result belongs to. */
  Person: IPerson;
  /** The core result information for the person; one element per race in the event. */
  Result?: IPersonRaceResult[];
}

/** Service requests made by a person. */
interface IPersonServiceRequest {
  /** The person that made the requests. */
  Person: IPerson;
  /** The service requests. */
  ServiceRequest: IServiceRequest[];
}

type PersonSexType = 'F' | 'M';

/** Start information for an individual competitor, including e.g. start time and bib number. */
interface IPersonStart {
  '@attributes': {
    modifyTime?: string;
  };

  /** The id corresponding to this person's entry in an EntryList. */
  EntryId?: IId;
  /** The organisation that the person is representing at the event. */
  Organisation?: IOrganisation;
  /** The person that the start time belongs to. Omit if there is no person assigned to the start time, e.g. a vacant person. */
  Person?: IPerson;
  /** The core start information for the person; one element per race in the event. */
  Start: IPersonRaceStart[];
}

interface IEventorRaceExtensions {
  EventRaceId?: number;
  StartListExists?: string;
  ResultListExists?: string;
  Discipline?: 'Foot';
  LightCondition?: 'Day' | 'Night' | 'Dusk' | 'Dawn';
}

/** An event consists of a number of races. The number is equal to the number of times a competitor should start. */
export interface IRace {
  '@attributes': {
    modifyTime?: string;
  };

  /** The classification or level of the race. This element overrides the Classification element of the parent Event element. */
  Classification?: EventClassification;
  Discipline?: RaceDiscipline[];
  /** The time when the finish closes. */
  EndTime?: IDateAndOptionalTime;
  Name: string;
  /** The main officials of the event, e.g. course setter and event president. */
  Official?: IRole[];
  /** The organisations that organise the event. */
  Organiser?: IOrganisation[];
  /** The geographical location of the arena. */
  Position?: IGeoPosition;
  /** The ordinal number of the race in the multi-race event, starting at 1. */
  RaceNumber: number;
  /** The services available for the race, e.g. accomodation and transport. */
  Service?: IService[];
  /** The start time for the first starting competitor of the race. */
  StartTime?: IDateAndOptionalTime;
  /** The status of the race. This element overrides the Status element of the parent Event element. */
  Status?: EventStatus;
  /** URLs to various types of additional information regarding the event, e.g. event website or result list. */
  URL?: IEventURL[];
  Extensions: IEventorRaceExtensions;
}

/** Information about a class with respect to a race. */
interface IRaceClass {
  '@attributes': {
    /** The maximum number of competitors that are allowed to take part in the race class. A competitor corresponds to a person (if an individual event) or a team (if a team or relay event). This attribute overrides the maxNumberOfCompetitors attribute in the Class element. */
    maxNumberOfCompetitors?: number;
    modifyTime?: string;
    /** The ordinal number of the race that the information belongs to for a multi-race event, starting at 1. */
    raceNumber?: number;
  };

  /** The courses assigned to this class. For a mass-start event or a relay event, there are usually multiple courses per class due to the usage of spreading methods. */
  Course?: ISimpleCourse[];
  /** The entry fees for an individual competitor taking part in the race class. Use the TeamFee element to specify a fee for the team as a whole. Use the Fee subelement of the Class element to specify a fee on event level. */
  Fee?: IFee[];
  FirstStart?: moment.Moment;
  /** The controls that are online controls for this class. */
  OnlineControl?: IControl[];
  /** The punching system used for the class at the race. Multiple punching systems can be specified, e.g. one for punch checking and another for timing. */
  PunchingSystem?: string[];
  /** The status of the race, e.g. if results should be considered invalid due to misplaced constrols. */
  Status?: RaceClassStatus;
  /** The entry fees for a team as a whole taking part in this class. Use the Fee element to specify a fee for an individual competitor in the team. Use the TeamFee subelement of the Class element to specify a fee on event level. */
  TeamFee?: IFee[];
}

/** The status of a certain race in the class. */
export type RaceClassStatus =
  | 'StartTimesNotAllocated'
  | 'StartTimesAllocated'
  | 'NotUsed'
  | 'Completed'
  | 'Invalidated'
  | 'InvalidatedNoFee';

/** This element defines all the control and course information for a race. */
interface IRaceCourseData {
  '@attributes': {
    /** The ordinal number of the race that the information belongs to for a multi-race event, starting at 1. */
    raceNumber?: number;
  };

  /** The assignment of courses to classes. */
  ClassCourseAssignment?: IClassCourseAssignment[];
  /** All controls of the race. */
  Control?: IControl[];
  /** All courses of the race. */
  Course?: ICourse[];
  /** The map(s) used in this race. Usually just one map, but different courses may use different scales and/or areas. */
  Map?: IMap[];
  /** The assignment of courses to individual competitors. */
  PersonCourseAssignment?: IPersonCourseAssignment[];
  /** The assignment of courses to relay team members teams. */
  TeamCourseAssignment?: ITeamCourseAssignment[];
}

export type RaceDiscipline = 'Sprint' | 'Middle' | 'Long' | 'Ultralong' | 'Other';

export interface IResultListType extends Omit<IBaseMessageElement, '@attributes'> {
  '@attributes': {
    /** The time when the file was created. */
    createTime?: string;
    /** The name of the software that created the file. */
    creator?: string;
    /** The version of the IOF Interface Standard that the file conforms to. */
    iofVersion: string;
    /** The status of the result list. */
    status?: ResultListTypeStatusType;
  };

  /** Result lists for the classes in the event. */
  ClassResult?: IClassResult[];
  /** The event that the result lists belong to. */
  Event: IEvent;
}

type ResultListTypeStatusType = 'Complete' | 'Delta' | 'Snapshot';

/** The result status of the person or team at the time of the result generation. */
export type ResultStatus =
  | 'OK'
  | 'Finished'
  | 'MissingPunch'
  | 'Disqualified'
  | 'DidNotFinish'
  | 'Active'
  | 'Inactive'
  | 'OverTime'
  | 'SportingWithdrawal'
  | 'NotCompeting'
  | 'Moved'
  | 'MovedUp'
  | 'DidNotStart'
  | 'DidNotEnter'
  | 'Cancelled';

/** A role defines a connection between a person and some kind of task, responsibility or engagement, e.g. being a course setter at an event. */
interface IRole {
  '@attributes': {
    /** The type of role that the person has. */
    type: string;
  };

  Person: IPerson;
}

/** Defines a route, i.e. a number of geographical positions (waypoints) describing a competitor's navigation throughout a course.
 *
 * As routes contain large amounts of information, a compact storage format is utilized to keep the overall file size small. A route is stored as a base64-encoded byte sequence of waypoints. A waypoint is represented as described below. All multi-byte data types are stored in big-endian byte order (most significant byte first). Typically, a one-hour route with one-second waypoint recording interval occupies around 20 kilobytes.
 *
 * Waypoint header byte
 * ====================
 * Each waypoint byte sequence starts with a waypoint header byte:
 * Waypoint header byte, bit 1: Waypoint type. 0 for normal waypoint, 1 for interruption waypoint. An interruption waypoint is a waypoint that is the last waypoint before an interruption in the route occurs, e.g. due to a satellite signal receiving failure. The last waypoint of a route should be a normal waypoint, not an interruption waypoint.
 * Waypoint header byte, bits 2 and 3: Time storage mode. For a description of the time storage modes, see below.
 * Bit 2   Bit 3   Time storage mode
 * 0      0      full storage mode (6 bytes)
 * 1      0      milliseconds delta storage mode (2 bytes)
 * 0      1      seconds delta storage mode (1 byte)
 * Waypoint header byte, bits 4 and 5: Position storage mode (latitude, longitude, and altitude (if present)). For a description of the position storage modes, see below.
 * Bit 4   Bit 5   Position storage mode
 * 0      0      full storage mode (4 + 4 (+ 3) bytes for latitude, longitude and altitude (if present))
 * 1      0      big delta delta storage mode (2 + 2 (+ 1) bytes)
 * 0      1      small delta storage mode (1 + 1 (+ 1) bytes)
 * Waypoint header byte, bit 6: Altitude presence. 0 if an altitude value is not present, 1 if it is present.
 * Waypoint header byte, bit 7: Unused, always 0.
 * Waypoint header byte, bit 8: Unused, always 0.
 *
 * Time byte sequence
 * ==================
 * After the waypoint byte comes the time byte sequence. Depending on the time storage mode defined in the waypoint header, the time byte sequence is either 6 bytes (full), 2 bytes (milliseconds delta) or 1 byte (seconds delta) long.
 *
 * Full storage mode
 * -----------------
 * The following 6 bytes are an unsigned 48-bit integer defining the waypoint's time as the number of milliseconds (1/1000 seconds) since January 1, 1900, 00:00:00 UTC.
 *
 * Milliseconds delta storage mode
 * -------------------------------
 * The following 2 bytes are an unsigned 16-bit integer defining the waypoint's time as the number of milliseconds to add to the last waypoint's time.
 *
 * Seconds delta storage mode
 * --------------------------
 * The following byte is an unsigned 8-bit integer defining the waypoint's time as the number of seconds to add to the last waypoint's time. This storage mody can only be used when the difference to the last waypoint's time is an integer value.
 *
 * Consequently:
 * - seconds delta storage mode is used when the waypoint's time is less than 256 seconds later than the last waypoint's time, and the difference between the times is an integer value.
 * - milliseconds delta storage mode is used when the waypoint's time is less than 65.536 seconds later than the last waypoint's time
 * - otherwise, full storage mode is used
 * The time of the first waypoint of a route is always stored in full storage mode.
 *
 * Position byte sequence
 * ======================
 * Next, the position byte sequence appears: latitude, longitude and (if present) altitude bytes. Depending on the position storage mode defined in the waypoint header, the position byte sequence is either 4 + 4 (+ 3) bytes (full), 2 + 2 (+ 1) bytes (big delta) or 1 + 1 (+ 1) bytes (small delta) long.
 *
 * Full storage mode
 * -----------------
 * The first 4 bytes are a signed 32-bit integer defining the waypoint's latitude as microdegrees (1/1000000 degrees) relative to the equator. A negative value implies a latitude south of the equator. A microdegree is approximately equivalent to 0.1 meters.
 * The following 4 bytes are a signed 32-bit integer defining the waypoint's latitude as microdegrees (1/1000000 degrees) relative to the Greenwich meridian. A negative value implies a longitude west of the Greenwich meridian. A microdegree is approximately equivalent to 0.1 meters at the equator and infinitely small at the poles.
 * If the altitude presence bit in the waypoint header bit is set to 1, the following 3 bytes are a signed 24-bit integer defining the waypoint's altitude as decimeters (1/10 meters) relative to the sea level.
 *
 * Big delta storage mode
 * ----------------------
 * The first 2 bytes are a signed 16-bit integer defining the waypoint's latitude as the number of microdegrees to add to the last waypoint's latitude.
 * The following 2 bytes are a signed 16-bit integer defining the waypoint's longitude as the number of microdegrees to add to the last waypoint's longitude.
 * If the altitude presence bit in the waypoint header bit is set to 1, the following byte is a signed 8-bit integer defining the waypoint's altitude as the number of decimeters to add to the last waypoint's altitude.
 *
 * Small delta storage mode
 * ----------------------
 * The first byte is a signed 8-bit integer defining the waypoint's latitude as the number of microdegrees to add to the last waypoint's latitude.
 * The following byte is a signed 8-bit integer defining the waypoint's longitude as the number of microdegrees to add to the last waypoint's longitude.
 * If the altitude presence bit in the waypoint header bit is set to 1, the following byte is a signed 8-bit integer defining the waypoint's altitude as the number of decimeters to add to the last waypoint's altitude.
 *
 * Consequently:
 * - small delta storage mode is used when the waypoint's latitude and longitude is within -0.000128 to 0.000127 degrees from the last waypoint's latitude, and when the altitude is not present or is within -12.8 to 12.7 meters from the last waypoint's altitude
 * - big delta storage mode is used when the waypoint's latitude and longitude is within -0.032768 to 0.032767 degrees from the last waypoint's latitude, and when the altitude is not present or is within -12.8 to 12.7 meters from the last waypoint's altitude
 * - otherwise, full storage mode is used
 * The position of the first waypoint of a route is always stored in full storage mode.
 *
 * Code libraries for reading and writing route data is found in https://github.com/international-orienteering-federation/datastandard-v3/tree/master/libraries. */
export type IRoute = string;

/** Defines the schedule of sub-events that comprise the entire orienteering event, e.g. banquets, social events and awards ceremonies. */
interface ISchedule {
  '@attributes': {
    modifyTime?: string;
  };

  /** Any extra information about the sub-event. */
  Details?: string;
  /** The end time of the sub-event. */
  EndTime?: moment.Moment;
  /** The name or title of the sub-event. */
  Name: string;
  /** The geographical position of the sub-event. */
  Position?: IGeoPosition;
  /** The start time of the sub-event. */
  StartTime: moment.Moment;
  /** The name of the place where the sub-event occurs. */
  Venue?: string;
}

/** The score earned in an event for some purpose, e.g. a ranking list. The 'type' attribute is used to specify which purpose. */
type IScore = number;

/** Defines a general purpose service request, e.g. for rental card or accomodation. */
interface IService {
  '@attributes': {
    modifyTime?: string;
    /** Used to mark special services, e.g. rental cards whose fees that are to be used in entry scenarios. */
    type?: string;
  };

  /** A further description of the service than the Name element gives. */
  Description?: ILanguageString[];
  /** The fees attached to this service. */
  Fee?: IFee[];
  Id?: IId;
  /** The maximum number of instances of this service that are available. Omit this element if there is no such limit. */
  MaxNumber?: number;
  /** The name of the service. */
  Name: ILanguageString[];
  /** The number of instances of this service that has been requested. */
  RequestedNumber?: number;
}

interface IServiceRequest {
  '@attributes': {
    modifyTime?: string;
  };

  /** The fees related to this service request. */
  AssignedFee?: IAssignedFee[];
  /** Any extra information or comment attached to the service request. */
  Comment?: string;
  /** The quantity (number of instances) of the service that has been delivered. Can differ from RequestedQuantity when the available number of instances of a service is limited. */
  DeliveredQuantity?: number;
  Id?: IId;
  /** The quantity (number of instances) of the service that is requested. */
  RequestedQuantity: number;
  /** The service that is requested. */
  Service: IService;
}

interface IServiceRequestListType extends IBaseMessageElement {
  /** The event that the service requests are valid for. */
  Event: IEvent;
  /** Service requests made by organisations. */
  OrganisationServiceRequest?: IOrganisationServiceRequest[];
  /** Service requests made by persons. */
  PersonServiceRequest?: IPersonServiceRequest[];
}

/** Defines a course, excluding controls. */
interface ISimpleCourse {
  /** The climb of the course, in meters, along the expected best route choice. */
  Climb?: number;
  /** The family or group of forked courses that the course is part of. */
  CourseFamily?: string;
  Id?: IId;
  /** The length of the course, in meters. */
  Length?: number;
  /** The name of the course. */
  Name?: string;
  /** The number of controls in the course, excluding start and finish. */
  NumberOfControls?: number;
}

/** Defines a course for a certain race, excluding controls. */
interface ISimpleRaceCourse extends ISimpleCourse {
  '@attributes': {
    /** The ordinal number of the race that the information belongs to for a multi-race event, starting at 1. */
    raceNumber?: number;
  };
}

/** Defines a split time at a control. */
interface ISplitTime {
  '@attributes': {
    /** The status of the split time. */
    status?: SplitTimeStatusType;
  };

  /** The code of the control. */
  ControlCode: string;
  /** The time, in seconds, elapsed from start to punching the control. Fractions of seconds (e.g. 258.7) may be used if the time resolution is higher than one second. */
  Time?: number;
}

type SplitTimeStatusType = 'OK' | 'Missing' | 'Additional';

interface IStartListType extends IBaseMessageElement {
  /** Start lists for the classes in the event. */
  ClassStart?: IClassStart[];
  /** The event that the start lists belong to. */
  Event: IEvent;
}

type IStartName = string;

/** Used to state start time allocation requests. It consists of a possible reference Organisation or Person and the allocation request, e.g. late start or grouped with the reference Organisation/Person. This way it is possible to state requests to the event organizer so that e.g. all members of an organisation has start times close to each other - or parents have start times far from each other. It is totally up to the event software and organizers whether they will support such requests. */
interface IStartTimeAllocationRequest {
  '@attributes': {
    /** The type of start time allocation request. */
    type?: StartTimeAllocationRequestTypeType;
  };
  /** The reference organisation for the start time allocation request. */
  Organisation?: IOrganisation;
  /** The reference person for the start time allocation request. */
  Person?: IPerson;
}

type StartTimeAllocationRequestTypeType = 'Normal' | 'EarlyStart' | 'LateStart' | 'SeparatedFrom' | 'GroupedWith';

/** Element that connects a number of team members in a relay team to a number of courses. Teams are matched by 1) BibNumber, 2) TeamName+ClassName. */
interface ITeamCourseAssignment {
  /** The bib number of the team. */
  BibNumber?: string;
  /** The name of the class that the team belongs to. */
  ClassName?: string;
  /** The assignment of courses to team members. */
  TeamMemberCourseAssignment?: ITeamMemberCourseAssignment[];
  /** The name of the team. */
  TeamName?: string;
}

/** Defines an event entry for a team. */
interface ITeamEntry {
  '@attributes': {
    modifyTime?: string;
  };

  /** The fees that the team as a whole has to pay when entering the event. In a multi-race event, there is usually one element for each race. If there are differentated fees for the team members, specify them in the TeamEntryPerson elements. */
  AssignedFee?: IAssignedFee[];
  /** The class(es) the team wants to take part in. Multiple classes may be provided in order of preference in scenarios where the number of competitors are limited in some classes. */
  Class?: IClass[];
  /** Contact information (name and e.g. mobile phone number) to a team leader or coach, expressed as plain text. */
  ContactInformation?: string;
  /** The time when the entry was first submitted. */
  EntryTime?: moment.Moment;
  Id?: IId;
  /** The name of the team. If a relay, this is probably the name of the club optionally followed by a sequence number to distinguish teams from the same club in a class. */
  Name: string;
  /** The organisation(s) that the team represents. */
  Organisation?: IOrganisation[];
  /** The numbers of the races that the team is taking part in. If not specified, team person takes part in all races. */
  Race?: number[];
  /** Defines the services requested by the team. */
  ServiceRequest?: IServiceRequest[];
  /** Any special preferences regarding start time that has to be taken into consideration when making the start list draw. */
  StartTimeAllocationRequest?: IStartTimeAllocationRequest;
  /** The persons that make up the team. */
  TeamEntryPerson?: ITeamEntryPerson[];
}

/** Defines a person that is part of a team entry. */
interface ITeamEntryPerson {
  /** The fees that this particular person has to pay when entering the event. In a multi-race event, there is usually one element for each race. Fees assigned to the team as a whole should be defined in the TeamEntry element. */
  AssignedFee?: IAssignedFee[];
  /** Information about the control cards (punching cards) that the person uses at the event. Multiple control cards can be specified, e.g. one for punch checking and another for timing. */
  ControlCard?: IControlCard[];
  /** For relay entries, the number of the leg that this person is taking part in. */
  Leg?: number;
  /** Defines the person's starting order within a team at a parallel relay leg. */
  LegOrder?: number;
  /** The organisation that the person represent. Omit if this is the same as the organsiation given in the TeamEntry element. */
  Organisation?: IOrganisation;
  /** The person. Omit if the person is not known at the moment, but for example the control card is known. */
  Person?: IPerson;
  /** Any score that is submitted together with the entry, e.g. World Ranking points. */
  Score?: IScore[];
}

/** Element that connects a course with a relay team member. Courses should be present in the RaceCourseData element and are matched on course name and/or course family. Team members are matched by 1) BibNumber, 2) Leg and LegOrder, 3) EntryId. */
interface ITeamMemberCourseAssignment {
  /** The bib number of the person or the team that the person belongs to. Omit if the bib number is specified in the TeamCourseAssignment element. */
  BibNumber?: string;
  /** The family or group of forked courses that the course is part of. */
  CourseFamily?: string;
  /** The name of the course. */
  CourseName?: string;
  /** The id corresponding to this person's entry in an EntryList. */
  EntryId?: IId;
  /** For relay entries, the number of the leg that the person is taking part in. */
  Leg?: number;
  /** Defines the person's starting order within a team at a parallel relay leg. */
  LegOrder?: number;
  /** The name of the person. */
  TeamMemberName?: string;
}

/** Result information for a person in a race. */
export interface ITeamMemberRaceResult {
  '@attributes': {
    /** The ordinal number of the race that the information belongs to for a multi-race event, starting at 1. */
    raceNumber?: number;
  };
  /** Defines the fees that the team member has been assigned. */
  AssignedFee?: IAssignedFee[];
  /** The bib number that the team member that the result belongs to is wearing. */
  BibNumber?: string;
  /** Defines the answer for a trail-O control. */
  ControlAnswer?: IControlAnswer[];
  /** Defines the control card assigned to the person. Multiple control cards can be specified, e.g. one for punch checking and another for timing. */
  ControlCard?: IControlCard[];
  /** Defines the course assigned to the person. */
  Course?: ISimpleCourse;
  /** The time when the team member that the result belongs to finished, expressed in ISO 8601 format. */
  FinishTime?: moment.Moment;
  /** In case of a relay, this is the number of the leg that the team member takes part in. */
  Leg?: number;
  /** In case of a relay with parallel legs, this defines the team member's starting order of the leg within the team. */
  LegOrder?: number;
  /** Holds the result after the current leg for the team. */
  OverallResult?: IOverallResult;
  /** The position in the result list for the person that the result belongs to. This element should only be present when the Status element is set to OK. */
  Position?: ITeamMemberRaceResultPositionType;
  /** Defines the person's route recorded by a tracking device. */
  Route?: string;
  /** Any scores that are attached to the result, e.g. World Ranking points. */
  Score?: IScore[];
  /** Defines the services requested by the team member. */
  ServiceRequest?: IServiceRequest[];
  /** Contains the times at each control of the course. Each control of the team member's course has to be defined in a SplitTime element, even if the control has not been punched. Start and finish times must not be present as SplitTime elements. */
  SplitTime?: ISplitTime[];
  /** The time when the team member that the result belongs to started, expressed in ISO 8601 format. */
  StartTime?: moment.Moment;
  /** The status of the result. */
  Status: ResultStatus;
  /** The time, in seconds, that is shown in the result list. Fractions of seconds (e.g. 258.7) may be used if the time resolution is higher than one second. */
  Time?: number;
  /** The time, in seconds, that the the team member is behind the winner. Fractions of seconds (e.g. 258.7) may be used if the time resolution is higher than one second. */
  TimeBehind?: ITeamMemberRaceResultTimeBehindType;
}

type ITeamMemberRaceResultPositionType = number;
type TeamMemberRaceResultPositionTypeTypeType = 'Leg' | 'Course';
type ITeamMemberRaceResultTimeBehindType = number;
type TeamMemberRaceResultTimeBehindTypeTypeType = 'Leg' | 'Course';

/** Start information for a team member in a race. */
interface ITeamMemberRaceStart {
  '@attributes': {
    /** The ordinal number of the race that the information belongs to for a multi-race event, starting at 1. */
    raceNumber?: number;
  };

  /** Defines the fees that the team member has been assigned. */
  AssignedFee?: IAssignedFee[];
  /** The bib number that the team member is wearing. */
  BibNumber?: string;
  /** Defines the control card assigned to the team member. Multiple control cards can be specified, e.g. one for punch checking and another for timing. */
  ControlCard?: IControlCard[];
  /** Defines the course assigned to the team member. */
  Course?: ISimpleCourse;
  /** In case of a relay, this is the number of the leg that the team member takes part in. */
  Leg?: number;
  /** In case of a relay with parallel legs, this defines the team member's starting order of the leg within the team. */
  LegOrder?: number;
  /** Defines the services requested by the team member. */
  ServiceRequest?: IServiceRequest[];
  /** The time when the team member starts. */
  StartTime?: moment.Moment;
}

/** Result information for a team member, including e.g. result status, place, finish time, and split times. */
export interface ITeamMemberResult {
  '@attributes': {
    modifyTime?: string;
  };

  /** The id corresponding to this team member's entry in an EntryList. */
  EntryId?: IId;
  /** The organisation that the team member is representing at the event. */
  Organisation?: IOrganisation;
  /** The team member that the result belongs to. If a relay team is missing a team member, omit this element. */
  Person?: IPerson;
  /** The core result information for the person; one element per race in the event. */
  Result?: ITeamMemberRaceResult[];
}

/** Start information for an individual competitor, including e.g. start time and bib number. */
interface ITeamMemberStart {
  '@attributes': {
    modifyTime?: string;
  };

  /** The id corresponding to this team member's entry in an EntryList. */
  EntryId?: IId;
  /** The organisation that the team member is representing at the event. */
  Organisation?: IOrganisation;
  /** The team member that the start time belongs to. */
  Person?: IPerson;
  /** The core start information for the team member; one element per race in the event. */
  Start: ITeamMemberRaceStart[];
}

/** Result information for a team, including e.g. result status, place, finish time and individual times for the team members. */
interface ITeamResult {
  /** Defines the fees that the team has been assigned. */
  AssignedFee?: IAssignedFee[];
  /** The bib number that the members of the team are wearing. If each team member has a unique bib number, use the BibNumber of the TeamMemberStart element. */
  BibNumber?: string;
  /** The id corresponding to this team's entry in an EntryList. */
  EntryId?: IId;
  /** The name of the team, e.g. organisation name and team number for a relay team. */
  Name: string;
  /** The organisation(s) the team is representing. */
  Organisation?: IOrganisation[];
  /** Defines the services requested by the team. */
  ServiceRequest?: IServiceRequest[];
  /** Defines the result information for each team member. One element per relay leg must be included, even if the team has not assigned any team member to the leg. */
  TeamMemberResult?: ITeamMemberResult[];
}

/** Start information for a team, including e.g. team name, start times and bib numbers. */
interface ITeamStart {
  '@attributes': {
    modifyTime?: string;
  };

  /** Defines the fees that the team has been assigned. */
  AssignedFee?: IAssignedFee[];
  /** The bib number that the members of the team are wearing. If each team member has a unique bib number, use the BibNumber of the TeamMemberStart element. */
  BibNumber?: string;
  /** The id corresponding to this team's entry in an EntryList. */
  EntryId?: IId;
  /** The name of the team, e.g. organisation name and team number for a relay team. Omit if the team name is not know, e.g. a vacant team. */
  Name?: string;
  /** The organisation(s) the team is representing. */
  Organisation?: IOrganisation[];
  /** Defines the services requested by the team. */
  ServiceRequest?: IServiceRequest[];
  /** Information about the start times for the team members. One element per relay leg must be included, even if the team has not assigned any team member to the leg. */
  TeamMemberStart?: ITeamMemberStart[];
}
