import type { OAuthProvider } from './sessionModel';

export interface ICouncilModel {
  councilId: number;
  name: string;
}

export interface IGroupModel {
  groupId: number;
  name: string;
  description: string;
  email?: string | null;
  showInCalendar: boolean;
}

/** A group the code depends on (e.g. cADMIN_GROUP_ID in php/include/users.php) */
export interface ISystemGroupModel {
  groupId: number;
  /** The translation users.SystemGroup<key> */
  key: 'Admin' | 'Coach' | 'Economy';
  /** The description in the database, null when the group is missing */
  description: string | null;
}

export interface IUserModel {
  userId: number;
  birthDay?: string | null;
  firstName: string;
  lastName: string;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  mobilePhoneNo?: string | null;
  workPhoneNo?: string | null;
  councilId: number;
  responsibility?: string | null;
  /** Linked by an administrator, see Accounts */
  competitorId?: number | null;
  groupIds: number[];
  /** The Google/Facebook accounts linked to the user (a user can have several), only to administrators */
  oauthAccounts?: IUserOAuthAccount[];
}

export interface IUserOAuthAccount {
  oauthId: number;
  provider: OAuthProvider;
  name: string;
  email: string | null;
}
