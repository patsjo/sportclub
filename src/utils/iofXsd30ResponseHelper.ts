import dayjs from 'dayjs';
import { IDateAndOptionalTime, IResultListType } from '../models/iof.xsd-3.0';

const arrayAttributesNodes = [
  'Address',
  'Account',
  'AllowedOnLeg',
  'AssignedFee',
  'Extensions/Attribute',
  'ClassList/Class',
  'Competitor/Class',
  'Event/Class',
  'PersonEntry/Class',
  'TeamEntry/Class',
  'ClassCourseAssignment',
  'ClassStart',
  'ClassResult',
  'ClassType',
  'Competitor',
  'Contact',
  'Control',
  'ControlAnswer',
  'ControlCard',
  'ClassResult/Course',
  'ClassStart/Course',
  'RaceClass/Course',
  'RaceCourseData/Course',
  'CourseControl',
  'Description',
  'Race/Discipline',
  'IEventListType/Event', //IEventListType is TopLevel (handle this outside)
  'Class/Fee',
  'RaceClass/Fee',
  'Service/Fee',
  'Form',
  'Person/Id',
  'Information',
  'Class/Leg',
  'Logotype',
  'Map',
  'Control/Name',
  'Fee/Name',
  'Service/Name',
  'News',
  'Official',
  'OnlineControl',
  'Competitor/Organisation',
  'IOrganisationListType/Organisation', //IOrganisationListType is TopLevel (handle this outside)
  'TeamEntry/Organisation',
  'TeamResult/Organisation',
  'TeamStart/Organisation',
  'OrganisationServiceRequest',
  'Organiser',
  'PersonCourseAssignment',
  'PersonEntry',
  'PersonServiceRequest',
  'PersonStart',
  'PersonResult',
  'PunchingSystem',
  'PunchingUnitId',
  'Race',
  'RaceClass',
  'RaceCourseData',
  'PersonEntry/RaceNumber',
  'Result',
  'Role',
  'Schedule',
  'Competitor/Score',
  'OverallResult/Score',
  'PersonEntry/Score',
  'PersonRaceResult/Score',
  'TeamEntryPerson/Score',
  'TeamMemberResult/Result/Score',
  'Event/Service',
  'Race/Service',
  'ServiceRequest',
  'SplitTime',
  'Start',
  'StartName',
  'TeamCourseAssignment',
  'TeamEntry',
  'TeamEntryPerson',
  'TeamFee',
  'TeamMemberCourseAssignment',
  'TeamMemberStart',
  'TeamMemberResult',
  'TeamStart',
  'TeamResult',
  'URL'
];

const numberAttributesNodes = [
  'AllowedOnLeg',
  'alt',
  'Amount',
  'Climb',
  'DeliveredQuantity',
  'EventRaceId',
  'lat',
  'Leg',
  'LegLength',
  'LegOrder',
  'Length',
  'lng',
  'MapId',
  'maxAge',
  'MaxNumber',
  'maxNumberOfCompetitors',
  'maxNumberOfTeamMembers',
  'maxTeamAge',
  'minAge',
  'minNumberOfCompetitors',
  'minNumberOfTeamMembers',
  'minTeamAge',
  'numberOfCompetitors',
  'NumberOfControls',
  'PaidAmount',
  'ParentOrganisationId',
  'Percentage',
  'Position',
  'Race',
  'RaceNumber',
  'raceNumber',
  'RequestedNumber',
  'RequestedQuantity',
  'Scale',
  'Score',
  'tapedRouteLength',
  'TaxablePercentage',
  'ControlAnswer/Time',
  'OverallResult/Time',
  'Result/Time',
  'SplitTime/Time',
  'TimeBehind',
  'timeResolution',
  'x',
  'y'
];

const datetimeAttributesNodes = [
  'BirthDate',
  'EndTime',
  'EntryTime',
  'FinishTime',
  'FirstStart',
  'FromDateOfBirth',
  'StartTime',
  'ToDateOfBirth',
  'ValidFromTime',
  'ValidToTime'
];

// interface = IDateAndOptionalTime
const datetimeObjectAttributesNodes = ['EndTime', 'StartTime'];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const correctPhpResponseArray = (json: Record<string, unknown>, key: string, node: string): void => {
  if (!Array.isArray(json[key]) && arrayAttributesNodes.some(n => node.endsWith(`/${n}`))) {
    if (!json[key]) json[key] = [];
    else json[key] = [json[key]];
  }
};

const correctPhpResponseTypes = (value: unknown, node: string): unknown => {
  const valuePrototype = Object.prototype.toString.call(value);
  if (valuePrototype === '[object String]' && numberAttributesNodes.some(n => node.endsWith(`/${n}`))) {
    const strValue = value as unknown as string;
    if (strValue.length > 0 && strValue.indexOf('.') >= 0 && !isNaN(Number(strValue))) return parseFloat(strValue);
    else if (strValue.length > 0 && !isNaN(Number(strValue))) return parseInt(strValue);
    else return undefined;
  } else if (valuePrototype === '[object String]' && datetimeAttributesNodes.some(n => node.endsWith(`/${n}`))) {
    const strValue = value as unknown as string;
    return value ? dayjs(strValue) : undefined;
  } else if (
    valuePrototype === '[object Object]' &&
    datetimeObjectAttributesNodes.some(n => node.endsWith(`/${n}`)) &&
    isObject(value)
  ) {
    const datetimeObject = value as unknown as IDateAndOptionalTime;
    if (datetimeObject.Date && datetimeObject.Time) {
      const dayjsObject = dayjs(`${datetimeObject.Date}T${datetimeObject.Time}`).local();

      datetimeObject.Date = dayjsObject.format('YYYY-MM-DD');
      datetimeObject.Time = dayjsObject.format('HH:mm');
    }
  }

  return value;
};

const correctPhpEventorProxyResponse = (json: Record<string, unknown> | undefined, parent = ''): void => {
  if (!json || Object.prototype.toString.call(json) !== '[object Object]') return;

  Object.keys(json).forEach(key => {
    const node = `${parent}/${key}`;

    correctPhpResponseArray(json, key, `/${node}`);

    const valuePrototype =
      Array.isArray(json[key]) && json[key].length > 0
        ? Object.prototype.toString.call(json[key][0])
        : Object.prototype.toString.call(json[key]);

    if (Array.isArray(json[key]) && json[key].length > 0 && valuePrototype === '[object Object]')
      json[key].forEach(item => correctPhpEventorProxyResponse(item, node));
    else if (Array.isArray(json[key]) && json[key].length > 0 && valuePrototype === '[object String]')
      json[key] = json[key].map(item => correctPhpResponseTypes(item, `/${node}`));
    else if (
      valuePrototype === '[object String]' ||
      (valuePrototype === '[object Object]' && datetimeObjectAttributesNodes.some(n => node.endsWith(`/${n}`)))
    )
      json[key] = correctPhpResponseTypes(json[key], `/${node}`);
    else if (valuePrototype === '[object Object]' && isObject(json[key]))
      correctPhpEventorProxyResponse(json[key], node);
  });
};

export const correctPhpEventorProxyXmlResponseForResult = (json: IResultListType | undefined): IResultListType => {
  if (!json || !json['@attributes'] || !json['@attributes'].iofVersion)
    throw new Error('Response is not a IOF XML, parsed to a json by proxy.');

  if (json['@attributes'].iofVersion !== '3.0') throw new Error('Only version 3.0 of IOF XML is supported.');

  correctPhpEventorProxyResponse(json as unknown as Record<string, unknown>);

  return json;
};
