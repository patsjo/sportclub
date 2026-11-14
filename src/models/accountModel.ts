import { OAuthProvider } from './sessionModel';

/** The answers from users/accounts.php */

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IRequestableGroup {
  groupId: number;
  description: string;
}

export interface IAccessRequest {
  requestId: number;
  /** A guest (Google/Facebook) */
  oauthId: number | null;
  /** A user, also a guest that is linked */
  userId: number | null;
  userName?: string | null;
  /** 0 = to become a member */
  groupId: number;
  message: string | null;
  status: AccessRequestStatus;
  creDate: string;
}

export interface IOAuthAccount {
  oauthId: number;
  provider: OAuthProvider;
  userId: number | null;
  userName: string | null;
  competitorId: number | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  pictureUrl: string | null;
  creDate: string;
  lastLoginDate: string;
}

export interface IAccountUser {
  userId: number;
  name: string;
  email: string | null;
  competitorId: number | null;
}

export interface IAccountsList {
  accounts: IOAuthAccount[];
  requests: IAccessRequest[];
  users: IAccountUser[];
  groups: IRequestableGroup[];
}

/** LINK and APPROVE, userId 0 creates a new user from the names */
export interface ILinkAccountRequest {
  oauthId?: number;
  requestId?: number;
  userId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  competitorId?: number | null;
  groupId?: number;
}
