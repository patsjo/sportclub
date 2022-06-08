import { SnapshotIn, types } from 'mobx-state-tree';

const CouncilModel = types.model({
  councilId: types.identifierNumber,
  name: types.string,
});

const GroupModel = types.model({
  groupId: types.identifierNumber,
  name: types.string,
  description: types.string,
  email: types.maybeNull(types.string),
  showInCalendar: types.boolean,
});

const UserModel = types.model({
  userId: types.identifierNumber,
  birthDay: types.maybeNull(types.string),
  firstName: types.string,
  lastName: types.string,
  address: types.maybeNull(types.string),
  zip: types.maybeNull(types.string),
  city: types.maybeNull(types.string),
  email: types.maybeNull(types.string),
  phoneNo: types.maybeNull(types.string),
  mobilePhoneNo: types.maybeNull(types.string),
  workPhoneNo: types.maybeNull(types.string),
  councilId: types.integer,
  responsibility: types.maybeNull(types.string),
  groupIds: types.array(types.integer),
});

export type ICouncilModelSnapshotIn = SnapshotIn<typeof CouncilModel>;
export type IGroupModelSnapshotIn = SnapshotIn<typeof GroupModel>;
export type IUserModelSnapshotIn = SnapshotIn<typeof UserModel>;
