const getMenuLevels = (splittedMenus, level = 1, prevMenus = '') => ({
    menuItems: splittedMenus
      .filter((m) => m.menuPaths.length === level && m.menuPaths.slice(0, level - 1).join('/') === prevMenus)
      .map((m) => ({ pageId: m.pageId, linkId: m.linkId, menuPath: m.menuPath, description: m.menuPaths.slice(level - 1).join(''), url: m.url, level: level })),
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
  
  export const getMenus = (menus) => {
    const splittedMenus = menus
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
        url: menu.url
      }));
    const menuLevels = getMenuLevels(splittedMenus);

    return menuLevels;
  };
