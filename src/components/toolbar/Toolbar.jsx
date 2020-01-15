import React, { Component } from "react";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
import DrawerRightMenu from "../menu/DrawerRightMenu";
import ToolbarItem from "./ToolbarItem";
import { dashboardContents } from "../../models/globalStateModel";

const ToolbarHolder = styled.div`
  &&& {
    display: inline-flex;
  }
`;

const WideToolbarHolder = styled.div`
  & {
    display: block;
  }
  @media screen and (max-width: 719px) {
    display: none !important;
  }
`;

// @inject("clubModel", "globalStateModel")
// @observer
const Toolbar = inject(
  "clubModel",
  "globalStateModel"
)(
  observer(
    class Toolbar extends Component {
      render() {
        const { t, clubModel, globalStateModel } = this.props;

        return (
          <ToolbarHolder>
            {clubModel.oldUrl ? (
              <ToolbarItem
                icon="rollback"
                name={t("common.OldHomePage")}
                onClick={() => {
                  const win = window.open(clubModel.oldUrl, "_blank");
                  win.focus();
                }}
              />
            ) : null}
            <WideToolbarHolder>
              {clubModel.modules.map((module, index) => (
                <ToolbarItem
                  key={"toolbarItem#" + module.name + index}
                  icon={module.name + "Icon"}
                  name={t("modules." + module.name)}
                  disabled={module.name !== "News" && module.name !== "Eventor"}
                  onClick={() => {
                    switch (module.name) {
                      case "Eventor":
                        const win = window.open(clubModel.eventor.url, "_blank");
                        win.focus();
                        break;
                      case "News":
                        globalStateModel.setDashboard(dashboardContents.news, "1990-01-01", "2099-12-31");
                        break;
                      default:
                        return null;
                    }
                  }}
                />
              ))}
            </WideToolbarHolder>
            <ToolbarItem
              icon={globalStateModel.rightMenuVisible ? "menu-unfold" : "menu-fold"}
              name={t("common.Menu")}
              onClick={() => globalStateModel.setValue("rightMenuVisible", !globalStateModel.rightMenuVisible)}
            />
            <DrawerRightMenu />
          </ToolbarHolder>
        );
      }
    }
  )
);

const ToolbarWithI18n = withTranslation()(Toolbar); // pass `t` function to App

export default ToolbarWithI18n;
