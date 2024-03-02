export interface IMenuItem {
  pageId?: number;
  linkId?: number;
  fileId?: number;
  description: string;
  menuPath: string;
  url?: string;
  level: number;
  createdByUserId?: number;
}

interface ISubMenu {
  subMenus: IMenu;
  description: string;
  level: number;
  folderId?: number;
  createdByUserId?: number;
}

export interface IMenu {
  menuItems: IMenuItem[];
  subMenus: ISubMenu[];
}
