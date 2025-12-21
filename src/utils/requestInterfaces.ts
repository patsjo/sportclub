import { IFile } from './formHelper';
import { IFileResponse } from './responseInterfaces';

export interface INewsEditRequest {
  iNewsID: number;
  iNewsTypeID: number;
  iRubrik: string;
  iLank: string;
  iInledning: string;
  iTexten: string;
  iExpireDate: string;
  iUpdateModificationDate: boolean;
  iFileID: number;
  iFileData?: string | null;
  iMimeType?: string | null;
  iFileSize?: number | null;
  iFileName?: string | null;
}
export interface ICompetitorInfoRequest {
  iCompetitorId: number;
  iSeniorAchievements?: string | null;
  iJuniorAchievements?: string | null;
  iYouthAchievements?: string | null;
  iThumbnail?: string | null;
}

export interface ISaveLinkRequest {
  iLinkID: number;
  iMenuPath: string;
  iUrl: string;
}

export interface IFileUploadRequest extends IFileResponse {
  files: IFile[];
  fileData?: string | null;
  mimeType?: string | null;
  fileSize?: number;
}
