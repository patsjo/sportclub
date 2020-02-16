import React, { Component } from "react";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
import { Drawer, Menu } from "antd";
import MenuItem from "./MenuItem";
import LoginMenuItem from "../login/LoginMenuItem";
import ModuleSubMenu from "./moduleSubMenus/ModuleSubMenu";
import MaterialIcon from "../materialIcon/MaterialIcon";
import { dashboardContents } from "../../models/globalStateModel";

const StyledDrawer = styled(Drawer)`
  &&& {
    top: 64px;
    height: calc(100% - 64px);
  }
`;

const StyledMenu = styled(Menu)`
  &&&.ant-menu-inline {
    border-right: 0px;
  }
`;

const StyledSubMenu = styled(Menu.SubMenu)`
  &&& {
    line-height: 22px;
    padding: 0;
  }
  &&& .ant-menu-submenu-title {
    line-height: 22px;
    height: 22px;
    padding: 0 !important;
  }
`;

// @inject("clubModel", "globalStateModel")
// @observer
const DrawerRightMenu = inject(
  "clubModel",
  "globalStateModel"
)(
  observer(
    class DrawerRightMenu extends Component {
      render() {
        const { t, clubModel, globalStateModel } = this.props;

        return (
          <StyledDrawer
            title={t("common.Menu")}
            placement="right"
            closable={false}
            width={360}
            visible={globalStateModel.rightMenuVisible}
            onClose={() => globalStateModel.setValue("rightMenuVisible", false)}
          >
            <StyledMenu mode="inline" onClick={() => globalStateModel.setValue("rightMenuVisible", false)}>
              <MenuItem
                key={"menuItem#home0"}
                icon={"HomeIcon"}
                name={t("modules.Home")}
                onClick={() => {
                  globalStateModel.setDashboard(dashboardContents.home);
                }}
              />
              <LoginMenuItem />
              {clubModel.modules.map((module, index) =>
                module.hasSubMenus ? (
                  <StyledSubMenu
                    key={"subMenu#" + module.name + index}
                    title={
                      <span>
                        <MaterialIcon icon={module.name + "Icon"} fontSize={18} marginRight={10} />
                        <span>{t("modules." + module.name)}</span>
                      </span>
                    }
                    disabled={
                      module.name !== "Calendar" &&
                      module.name !== "News" &&
                      module.name !== "Eventor" &&
                      module.name !== "Results"
                    }
                  >
                    <ModuleSubMenu module={module} />
                  </StyledSubMenu>
                ) : (
                  <ModuleSubMenu module={module} />
                )
              )}
            </StyledMenu>
          </StyledDrawer>
        );
      }
    }
  )
);

const DrawerRightMenuWithI18n = withTranslation()(DrawerRightMenu); // pass `t` function to App

export default DrawerRightMenuWithI18n;
