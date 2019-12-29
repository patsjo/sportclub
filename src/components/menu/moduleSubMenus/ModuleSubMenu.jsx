import React from "react";
import PropTypes from "prop-types";
import NewsSubMenus from "./NewsSubMenus";
import ResultsSubMenus from "./ResultsSubMenus";
import MenuItem from "../MenuItem";
import { useTranslation } from "react-i18next";
import { inject, observer } from "mobx-react";

const ModuleSubMenu = inject(
  "clubModel",
  "globalStateModel"
)(
  observer(props => {
    const { module, clubModel, globalStateModel } = props;
    const { t } = useTranslation();

    switch (module.name) {
      case "Eventor":
        return (
          <MenuItem
            key={"menuItem#eventor"}
            icon={module.name + "Icon"}
            name={t("modules.Eventor")}
            onClick={() => {
              globalStateModel.setValue("rightMenuVisible", false);
              const win = window.open(clubModel.eventor.url, "_blank");
              win.focus();
            }}
          />
        );
      case "News":
        return <NewsSubMenus />;
      case "Results":
        return <ResultsSubMenus />;
      default:
        return null;
    }
  })
);

ModuleSubMenu.propTypes = {
  module: PropTypes.object.isRequired
};

export default ModuleSubMenu;
