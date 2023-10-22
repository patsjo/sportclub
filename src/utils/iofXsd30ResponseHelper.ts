import { IDateAndOptionalTime, IResultListType } from 'models/iof.xsd-3.0';
import moment from 'moment';

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
  'URL',
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
  'y',
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
  'ValidToTime',
];

// interface = IDateAndOptionalTime
const datetimeObjectAttributesNodes = ['EndTime', 'StartTime'];

const correctPhpResponseArray = (json: Record<string, any>, key: string, node: string): void => {
  if (!Array.isArray(json[key]) && arrayAttributesNodes.some((n) => node.endsWith(`/${n}`))) {
    if (!json[key]) json[key] = [];
    else json[key] = [json[key]];
  }
};

const correctPhpResponseTypes = (value: any, node: string): any => {
  const valuePrototype = Object.prototype.toString.call(value);
  if (valuePrototype === '[object String]' && numberAttributesNodes.some((n) => node.endsWith(`/${n}`))) {
    if (value.length > 0 && value.indexOf('.') >= 0 && !isNaN(value)) return parseFloat(value);
    else if (value.length > 0 && !isNaN(value)) return parseInt(value);
    else return undefined;
  } else if (valuePrototype === '[object String]' && datetimeAttributesNodes.some((n) => node.endsWith(`/${n}`))) {
    return value ? moment(value) : undefined;
  } else if (
    valuePrototype === '[object Object]' &&
    datetimeObjectAttributesNodes.some((n) => node.endsWith(`/${n}`))
  ) {
    const datetimeObject = value as IDateAndOptionalTime;
    if (datetimeObject.Date && datetimeObject.Time) {
      const momentObject = moment(`${datetimeObject.Date}T${datetimeObject.Time}`).local();

      datetimeObject.Date = momentObject.format('YYYY-MM-DD');
      datetimeObject.Time = momentObject.format('HH:mm');
    }
  }

  return value;
};

const correctPhpEventorProxyResponse = (json: Record<string, any> | undefined, parent = ''): void => {
  if (!json || Object.prototype.toString.call(json) !== '[object Object]') return;

  Object.keys(json).forEach((key) => {
    const node = `${parent}/${key}`;

    correctPhpResponseArray(json, key, `/${node}`);

    const valuePrototype =
      Array.isArray(json[key]) && json[key].length > 0
        ? Object.prototype.toString.call(json[key][0])
        : Object.prototype.toString.call(json[key]);

    if (Array.isArray(json[key]) && json[key].length > 0 && valuePrototype === '[object Object]')
      json[key].forEach((item: any) => correctPhpEventorProxyResponse(item, node));
    else if (Array.isArray(json[key]) && json[key].length > 0 && valuePrototype === '[object String]')
      json[key] = json[key].map((item: any) => correctPhpResponseTypes(item, `/${node}`));
    else if (
      valuePrototype === '[object String]' ||
      (valuePrototype === '[object Object]' && datetimeObjectAttributesNodes.some((n) => node.endsWith(`/${n}`)))
    )
      json[key] = correctPhpResponseTypes(json[key], `/${node}`);
    else if (valuePrototype === '[object Object]') correctPhpEventorProxyResponse(json[key], node);
  });
};

export const correctPhpEventorProxyXmlResponseForResult = (json: Record<string, any> | undefined): IResultListType => {
  if (!json || !json['@attributes'] || !json['@attributes'].iofVersion)
    throw new Error('Response is not a IOF XML, parsed to a json by proxy.');

  if (json['@attributes'].iofVersion !== '3.0') throw new Error('Only version 3.0 of IOF XML is supported.');

  correctPhpEventorProxyResponse(json);

  return json as unknown as IResultListType;
};
