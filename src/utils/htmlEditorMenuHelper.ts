import { IMenu, ISubMenu } from '../models/htmlEditorModel';
import { IFolderResponse, IMenuResponse } from './responseInterfaces';

interface ISplittedMenu {
  menuPath: string;
  menuPaths: string[];
  pageId?: number;
  linkId?: number;
  fileId?: number;
  url?: string;
  createdByUserId?: number;
}
const getMenuLevels = (
  splittedMenus: ISplittedMenu[],
  foldersResponse: IFolderResponse[],
  level: number,
  parentFolderId: number | undefined,
  parentMenuPath: string = '/'
): IMenu => ({
  menuItems: splittedMenus
    .filter(m => m.menuPaths.length === level)
    .map(m => ({
      pageId: m.pageId,
      linkId: m.linkId,
      fileId: m.fileId,
      menuPath: m.menuPath,
      description: m.menuPaths.slice(level - 1).join(''),
      url: m.url,
      level: level,
      createdByUserId: m.createdByUserId
    })),
  subMenus: splittedMenus
    .filter(
      (m, index, self) =>
        m.menuPaths.length > level && index === self.findIndex(m2 => m.menuPaths[level - 1] === m2.menuPaths[level - 1])
    )
    .map(m => {
      const menuPath = `/${m.menuPaths.slice(0, level).join('/')}`;
      const menuFolder = foldersResponse.find(folder => folder.menuPath === menuPath);
      return {
        menuPath,
        subMenus: getMenuLevels(
          splittedMenus.filter(m2 => m2.menuPaths.length > level && m.menuPaths[level - 1] === m2.menuPaths[level - 1]),
          foldersResponse,
          level + 1,
          menuFolder?.folderId
        ),
        description: m.menuPaths.slice(level - 1, level).join(''),
        level: level,
        folderId: menuFolder?.folderId,
        createdByUserId: menuFolder?.createdByUserId,
        bothMenus: true
      };
    })
    .concat(
      foldersResponse
        .filter(folder => folder.parentFolderId === parentFolderId)
        .map(folder => ({
          menuPath: `${parentMenuPath}${folder.folderName}`,
          subMenus: getMenuLevels(
            [],
            foldersResponse,
            level + 1,
            folder.folderId,
            `${parentMenuPath}${folder.folderName}/`
          ),
          description: folder.folderName,
          level: level,
          folderId: folder.folderId,
          createdByUserId: folder.createdByUserId,
          bothMenus: false
        }))
    )
    .filter((m, _, self) => !m.folderId || self.filter(sm => sm.folderId === m.folderId).length === 1 || m.bothMenus)
});

export const getMenus = (menus: IMenuResponse[], foldersResponse: IFolderResponse[]): IMenu => {
  const splittedMenus: ISplittedMenu[] = menus
    .sort((a, b) =>
      a.menuPath.toLowerCase() > b.menuPath.toLowerCase()
        ? 1
        : b.menuPath.toLowerCase() > a.menuPath.toLowerCase()
          ? -1
          : 0
    )
    .map(menu => ({
      menuPath: menu.menuPath,
      menuPaths: menu.menuPath.replace(/^[\s/]+|[\s/]+$/g, '').split('/'),
      pageId: menu.pageId,
      linkId: menu.linkId,
      fileId: menu.fileId,
      url: menu.url,
      createdByUserId: menu.createdByUserId
    }));
  const menuLevels = getMenuLevels(splittedMenus, foldersResponse, 1, 0);

  return menuLevels;
};

export const getPageId = (menu: IMenu, menuPath: string, level = 0): number | null | undefined => {
  if (!menu) {
    return null;
  }
  let menuItem = menu.menuItems?.find(
    m => m.menuPath.toLocaleLowerCase().replace(/\s+/g, '') === menuPath.toLocaleLowerCase().replace(/\s+/g, '')
  );
  if (menuItem) {
    return menuItem.pageId;
  }
  const menuPaths = menuPath.replace(/^[\s/]+|[\s/]+$/g, '').split('/');
  if (Array.isArray(menuPaths) && menuPaths.length > level + 1) {
    let subMenu = menu.subMenus?.find(m => m.description === menuPaths[level]);
    if (subMenu) {
      return getPageId(subMenu.subMenus, menuPath, level + 1);
    }
    subMenu = menu.subMenus?.find(
      m =>
        m.description.toLocaleLowerCase().replace(/\s+/g, '') ===
        menuPaths[level].toLocaleLowerCase().replace(/\s+/g, '')
    );
    if (subMenu) {
      return getPageId(subMenu.subMenus, menuPath, level + 1);
    }
  }
  menuItem = menu.menuItems?.find(
    m => m.menuPath.toLocaleLowerCase().replace(/\s+/g, '') === menuPath.toLocaleLowerCase().replace(/\s+/g, '')
  );
  if (menuItem) {
    return menuItem.pageId;
  }
  return null;
};

export const getSubMenu = (menu: IMenu, menuPath: string, level = 0): ISubMenu | undefined => {
  if (!menu) {
    return undefined;
  }
  let subMenu = menu.subMenus?.find(
    m => m.menuPath.toLocaleLowerCase().replace(/\s+/g, '') === menuPath.toLocaleLowerCase().replace(/\s+/g, '')
  );
  if (subMenu) {
    return subMenu;
  }
  const menuPaths = menuPath.replace(/^[\s/]+|[\s/]+$/g, '').split('/');
  if (Array.isArray(menuPaths) && menuPaths.length > level + 1) {
    let subMenu = menu.subMenus?.find(m => m.description === menuPaths[level]);
    if (subMenu) {
      return getSubMenu(subMenu.subMenus, menuPath, level + 1);
    }
    subMenu = menu.subMenus?.find(
      m =>
        m.description.toLocaleLowerCase().replace(/\s+/g, '') ===
        menuPaths[level].toLocaleLowerCase().replace(/\s+/g, '')
    );
    if (subMenu) {
      return getSubMenu(subMenu.subMenus, menuPath, level + 1);
    }
  }
  subMenu = menu.subMenus?.find(
    m => m.menuPath.toLocaleLowerCase().replace(/\s+/g, '') === menuPath.toLocaleLowerCase().replace(/\s+/g, '')
  );
  if (subMenu) {
    return subMenu;
  }
  return undefined;
};
