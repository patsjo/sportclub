export interface IMenuItem {
  pageId?: number;
  linkId?: number;
  description: string;
  menuPath: string;
  url?: string;
  level: number;
}

interface ISubMenu {
  subMenus: IMenu;
  description: string;
  level: number;
}

export interface IMenu {
  menuItems: IMenuItem[];
  subMenus: ISubMenu[];
}
