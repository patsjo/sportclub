export interface ICalendarActivityRequest {
  iActivityDurationMinutes: number | null;
  iActivityID: number | string;
  iActivityTypeID?: number;
  iActivityDay: string;
  iActivityTime?: string;
  iDescription: string;
  iGroupId: number;
  iHeader: string;
  iLatitude: number | null;
  iLongitude: number | null;
  iPlace?: string;
  iRepeatingGid: string | null;
  iRepeatingModified: boolean;
  iResponsibleUserId?: number;
  iUrl?: string;
  iFirstRepeatingDate?: string | null;
  iLastRepeatingDate?: string | null;
  iIsRepeating: boolean;
  iIsEvent?: boolean;
}
