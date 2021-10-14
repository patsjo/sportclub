import { IAnyModelType, Instance, SnapshotIn, types } from 'mobx-state-tree';

const MenuItem = types.model({
  pageId: types.maybeNull(types.number),
  linkId: types.maybeNull(types.number),
  description: types.string,
  menuPath: types.string,
  url: types.maybeNull(types.string),
  level: types.number,
});
export type IMenuItem = Instance<typeof MenuItem>;

const SubMenu = types.model({
  subMenus: types.late((): IAnyModelType => Menu),
  description: types.string,
  level: types.number,
});

export const Menu = types.model({
  menuItems: types.array(MenuItem),
  subMenus: types.late(() => types.array(SubMenu)),
});
export type IMenu = Instance<typeof Menu>;
export type IMenuSnapshotIn = SnapshotIn<typeof Menu>;
