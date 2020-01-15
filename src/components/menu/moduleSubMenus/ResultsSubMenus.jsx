import React, { useState } from "react";
import { inject, observer } from "mobx-react";
import PropTypes from "prop-types";
import MenuItem from "../MenuItem";
import { useTranslation } from "react-i18next";
import { dashboardContents } from "../../../models/globalStateModel";
import ResultsWizardModal from "../../results/ResultsWizardModal";

const moduleName = "Results";
const ResultsSubMenus = inject(
  "clubModel",
  "globalStateModel",
  "sessionModel"
)(
  observer(props => {
    const { t } = useTranslation();
    const { clubModel, globalStateModel, sessionModel } = props;
    const moduleInfo = clubModel.module("Results");
    const [addResultsWizardModalIsOpen, setAddResultsWizardModalIsOpen] = useState(false);
    const [addOldResultsWizardModalIsOpen, setAddOldResultsWizardModalIsOpen] = useState(false);

    return (
      <>
        {addResultsWizardModalIsOpen ? (
          <ResultsWizardModal
            open={addResultsWizardModalIsOpen}
            onClose={() => setAddResultsWizardModalIsOpen(false)}
          />
        ) : null}
        <MenuItem
          key={"menuItem#results"}
          icon={moduleName + "Icon"}
          name={t("results.Latest")}
          disabled={true || !sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setDashboard(dashboardContents.results, "1990-01-01", "2099-12-31", 1);
          }}
        />
        <MenuItem
          key={"menuItem#resultsIndividual"}
          icon="user"
          name={t("results.Individual")}
          disabled={true || !sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setDashboard(dashboardContents.news, "1990-01-01", "2099-12-31", 2);
          }}
        />
        <MenuItem
          key={"menuItem#resultsTeam"}
          icon="team"
          name={t("results.Team")}
          disabled={true || !sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setDashboard(dashboardContents.news, "1990-01-01", "2099-12-31", 3);
          }}
        />
        <MenuItem
          key={"menuItem#resultsAdd"}
          icon="plus"
          name={t("results.Add")}
          disabled={!moduleInfo.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue("rightMenuVisible", false);
            setAddResultsWizardModalIsOpen(true);
          }}
        />
        <MenuItem
          key={"menuItem#resultsConvert"}
          icon="cloud-upload"
          name={t("results.Convert")}
          disabled={true || !sessionModel.loggedIn || !sessionModel.isAdmin}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue("rightMenuVisible", false);
            setAddOldResultsWizardModalIsOpen(true);
          }}
        />
      </>
    );
  })
);

ResultsSubMenus.propTypes = {
  moduleName: PropTypes.string.isRequired
};

export default ResultsSubMenus;
