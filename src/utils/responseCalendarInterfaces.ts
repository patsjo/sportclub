import { IOption } from './formHelper';

export interface ICalendarActivity {
  activityDurationMinutes: number | null;
  activityId: number | string;
  activityTypeId?: number;
  date: string;
  description: string;
  groupId: number;
  header: string;
  latitude: number | null;
  longitude: number | null;
  place?: string;
  repeatingGid: string | null;
  repeatingModified: boolean;
  responsibleUserId?: number;
  time?: string;
  url?: string;
  firstRepeatingDate?: string;
  lastRepeatingDate?: string;
  isEvent?: boolean;
}

export interface ICalendarEvent {
  calendarEventId: number;
  date: string;
  eventorId: number;
  eventorRaceId: number;
  latitude: number;
  longitude: number;
  name: string;
  organiserName: string;
  time: string;
}

export interface ICalendarDomains {
  activityTypes: IOption[];
  groups: IOption[];
  users: IOption[];
}
