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
  groupIds: number[];
}
