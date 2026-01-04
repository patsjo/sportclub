import { List } from 'antd';
import { ISubMenu } from '../../models/htmlEditorModel';

interface IShowSubmenuItems {
  subMenu: ISubMenu;
  showHeader?: boolean;
}

const ShowSubmenuItems = ({ subMenu, showHeader = true }: IShowSubmenuItems) => {
  return (
    <div>
      {showHeader ? <h1>{subMenu.description}</h1> : null}
      <List
        key={`menu-${subMenu.description.toLocaleLowerCase().replace(/\s+/g, '')}`}
        bordered
        dataSource={[
          ...subMenu.subMenus.menuItems.map(menuItem => ({
            key: `menu-item-${menuItem.description.toLocaleLowerCase().replace(/\s+/g, '')}`,
            subMenu: null,
            description: menuItem.description,
            path: menuItem.menuPath
          })),
          ...subMenu.subMenus.subMenus.map(subMenu => ({
            key: `submenu-item-${subMenu.description.toLocaleLowerCase().replace(/\s+/g, '')}`,
            subMenu: subMenu,
            description: subMenu.description,
            path: subMenu.menuPath
          }))
        ]}
        renderItem={item => (
          <List.Item key={item.key} style={{ display: 'block' }}>
            <a href={item.path}>{item.description}</a>
            {item.subMenu != null ? <ShowSubmenuItems subMenu={item.subMenu} showHeader={false} /> : null}
          </List.Item>
        )}
        style={{
          marginBlockStart: '0.67em',
          marginBlockEnd: '0.67em',
          maxWidth: showHeader ? 600 : 'unset',
          width: showHeader ? 'fit-content' : 'unset'
        }}
      />
    </div>
  );
};

export default ShowSubmenuItems;
