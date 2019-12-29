import React, { useState } from "react";
import { inject, observer } from "mobx-react";
import PropTypes from "prop-types";
import MenuItem from "../MenuItem";
import { useTranslation } from "react-i18next";
import { dashboardContents } from "../../../models/globalStateModel";
import NewsEdit from "../../news/NewsEdit";

const moduleName = "News";
const defaultNewsObject = {
  expireDate: new Date(new Date().getTime() + 86400000 * 14)
    .toISOString()
    .substr(0, 10),
  fileId: 0,
  header: "",
  id: 0,
  introduction: "",
  link: "",
  newsTypeId: 1,
  text: ""
};

const NewsSubMenus = inject(
  "clubModel",
  "globalStateModel",
  "sessionModel"
)(
  observer(props => {
    const { t } = useTranslation();
    const { clubModel, globalStateModel, sessionModel } = props;
    const moduleInfo = clubModel.module("News");
    const [addNewsModalIsOpen, setAddNewsModalIsOpen] = useState(false);

    return (
      <>
        {addNewsModalIsOpen ? (
          <NewsEdit
            newsObject={defaultNewsObject}
            open={addNewsModalIsOpen}
            onChange={insertedNewsObject =>
              globalStateModel.news.addNewsItemToTop(insertedNewsObject)
            }
            onClose={() => setAddNewsModalIsOpen(false)}
          />
        ) : null}
        <MenuItem
          key={"menuItem#newsAdd"}
          icon="plus"
          name={t("news.Add")}
          disabled={!moduleInfo.addUrl || !sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue("rightMenuVisible", false);
            setAddNewsModalIsOpen(true);
          }}
        />
        <MenuItem
          key={"menuItem#news"}
          icon={moduleName + "Icon"}
          name={t("modules." + moduleName)}
          isSubMenu
          onClick={() => {
            globalStateModel.setDashboard(
              dashboardContents.news,
              "1990-01-01",
              "2099-12-31"
            );
          }}
        />
        <MenuItem
          key={"menuItem#newsLongTime"}
          icon={moduleName + "Icon"}
          name={t("news.LongTimeNews")}
          isSubMenu
          onClick={() => {
            globalStateModel.setDashboard(
              dashboardContents.news,
              "1990-01-01",
              "2099-12-31",
              2
            );
          }}
        />
        <MenuItem
          key={"menuItem#educations"}
          icon="book"
          name={t("news.Educations")}
          isSubMenu
          onClick={() => {
            globalStateModel.setDashboard(
              dashboardContents.news,
              "1990-01-01",
              "2099-12-31",
              3
            );
          }}
        />
      </>
    );
  })
);

NewsSubMenus.propTypes = {
  moduleName: PropTypes.string.isRequired
};

export default NewsSubMenus;
