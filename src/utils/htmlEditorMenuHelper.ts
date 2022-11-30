import { IMenu } from 'models/htmlEditorModel';
import { IMenuResponse } from './responseInterfaces';

interface ISplittedMenu {
  menuPath: string;
  menuPaths: string[];
  pageId?: number;
  linkId?: number;
  url?: string;
}
const getMenuLevels = (splittedMenus: ISplittedMenu[], level = 1, prevMenus = ''): IMenu => ({
  menuItems: splittedMenus
    .filter((m) => m.menuPaths.length === level && m.menuPaths.slice(0, level - 1).join('/') === prevMenus)
    .map((m) => ({
      pageId: m.pageId,
      linkId: m.linkId,
      menuPath: m.menuPath,
      description: m.menuPaths.slice(level - 1).join(''),
      url: m.url,
      level: level,
    })),
  subMenus: splittedMenus
    .filter(
      (m, index, self) =>
        m.menuPaths.length > level &&
        m.menuPaths.slice(0, level - 1).join('/') === prevMenus &&
        index ===
          self.findIndex(
            (m2) => m.menuPaths.slice(level - 1, level).join('') === m2.menuPaths.slice(level - 1, level).join('')
          )
    )
    .map((m) => ({
      subMenus: getMenuLevels(splittedMenus, level + 1, m.menuPaths.slice(0, level).join('/')),
      description: m.menuPaths.slice(level - 1, level).join(''),
      level: level,
    })),
});

export const getMenus = (menus: IMenuResponse[]): IMenu => {
  const splittedMenus: ISplittedMenu[] = menus
    .sort((a, b) =>
      a.menuPath.toLowerCase() > b.menuPath.toLowerCase()
        ? 1
        : b.menuPath.toLowerCase() > a.menuPath.toLowerCase()
        ? -1
        : 0
    )
    .map((menu) => ({
      menuPath: menu.menuPath,
      menuPaths: menu.menuPath.replace(/^[\s/]+|[\s/]+$/g, '').split('/'),
      pageId: menu.pageId,
      linkId: menu.linkId,
      url: menu.url,
    }));
  const menuLevels = getMenuLevels(splittedMenus);

  return menuLevels;
};

export const getPageId = (menu: IMenu, menuPath: string, level = 0): number | null | undefined => {
  if (!menu) {
    return null;
  }
  let menuItem = menu.menuItems?.find((m) => m.menuPath === menuPath);
  if (menuItem) {
    return menuItem.pageId;
  }
  const menuPaths = menuPath.replace(/^[\s/]+|[\s/]+$/g, '').split('/');
  if (Array.isArray(menuPaths) && menuPaths.length > level + 1) {
    let subMenu = menu.subMenus?.find((m) => m.description === menuPaths[level]);
    if (subMenu) {
      return getPageId(subMenu.subMenus, menuPath, level + 1);
    }
    subMenu = menu.subMenus?.find(
      (m) =>
        m.description.toLocaleLowerCase().replace(/\s+/g, '') ===
        menuPaths[level].toLocaleLowerCase().replace(/\s+/g, '')
    );
    if (subMenu) {
      return getPageId(subMenu.subMenus, menuPath, level + 1);
    }
  }
  menuItem = menu.menuItems?.find(
    (m) => m.menuPath.toLocaleLowerCase().replace(/\s+/g, '') === menuPath.toLocaleLowerCase().replace(/\s+/g, '')
  );
  if (menuItem) {
    return menuItem.pageId;
  }
  return null;
};
