import { types } from "mobx-state-tree";

const MenuItem = types.model({
  pageId: types.number,
  description: types.string,
  level: types.number
});

const SubMenu = types.model({
  subMenus: types.late(() => Menu),
  description: types.string,
  level: types.number
});

export const Menu = types.model({
  menuItems: types.array(MenuItem),
  subMenus: types.late(() => types.array(SubMenu))
});
