import { IRaceEventProps, IRaceResultProps, IRaceTeamResultProps } from '../models/resultModel';
import {
  DistanceTypes,
  EventClassificationIdTypes,
  GenderType,
  LightConditionTypes,
  SportCodeTypes
} from './resultConstants';

export interface IHtmlPageGroupResponse {
  groupId: number;
  description: string;
  selected: boolean;
}

export interface IHtmlPageResponse {
  pageId: number;
  menuPath: string;
  groups: IHtmlPageGroupResponse[];
  data: string;
  isEditable: boolean;
}

export interface IMenuResponse {
  menuPath: string;
  pageId?: number;
  linkId?: number;
  fileId?: number;
  url?: string;
  createdByUserId?: number;
}

export interface IFileResponse {
  fileId: number;
  folderId: number;
  fileName?: string | null;
  story?: string | null;
  needPassword: boolean;
  allowedGroupId: number;
  orderField: number;
}

export interface IFolderResponse {
  folderId: number;
  folderName: string;
  parentFolderId: number;
  preStory?: string | null;
  postStory?: string | null;
  needPassword: boolean;
  allowedGroupId: number;
  menuPath: string;
  createdByUserId?: number;
}

export interface IPrintSettingsColumn {
  key: string;
  selected: boolean;
  title: string;
}

export interface IPrintSettingsTable {
  columns: IPrintSettingsColumn[];
}

export interface IPrintSettingsPdf extends IPrintSettingsTable {
  pageMargins: [number, number, number, number];
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'A3';
}

export interface IPrintSettings {
  pdf: IPrintSettingsPdf;
  table: IPrintSettingsTable;
}

export interface IFeeResponse {
  competitorId: number;
  name: string;
  originalFee: number;
  lateFee: number;
  feeToClub: number;
  serviceFeeToClub: number;
  totalFeeToClub?: number;
}

export interface IViewResultRaceInfo {
  eventClassificationId: EventClassificationIdTypes;
  eventId: number;
  eventorId: number;
  eventorRaceId: number;
  name: string;
  organiserName: string;
  raceDate: string;
  raceDistance: DistanceTypes;
  raceLightCondition: LightConditionTypes;
  raceTime: string;
  sportCode: SportCodeTypes;
}

export interface IViewResult extends IRaceResultProps {
  firstName?: string;
  lastName?: string;
  gender?: GenderType;
  feeToClub: number;
  serviceFeeToClub: number;
}

export interface IViewTeamResult extends IRaceTeamResultProps {
  firstName?: string;
  lastName?: string;
  gender?: GenderType;
  feeToClub: number;
  serviceFeeToClub: number;
}

export interface IIndividualViewResultResponse {
  results: (IViewResult & IViewResultRaceInfo)[];
  teamResults: (IViewTeamResult & IViewResultRaceInfo)[];
}
export interface IClubViewResultResponse extends IRaceEventProps {
  results: IViewResult[];
  teamResults: IViewTeamResult[];
}

export interface IEventViewResultResponse {
  date: string;
  eventId: number;
  eventorId: number;
  eventorRaceId: number | null;
  invoiceVerified: boolean;
  isRelay: boolean;
  name: string;
  time: string;
  fee?: number;
  feeToClub?: number;
  serviceFeeToClub?: number;
}

export interface ILeagueCompetitor {
  birthYear: number;
  competitorId: number;
  gender: GenderType;
  name: string;
  points: number[];
  points1000: number[];
  pointsOld: number[];
  ranking: number[];
  rankingRelay: number[];
  speedRanking: number[];
  technicalRanking: number[];
}
