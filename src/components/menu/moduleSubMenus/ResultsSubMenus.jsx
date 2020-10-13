import React, { useState, lazy, Suspense } from "react";
import { inject, observer } from "mobx-react";
import MenuItem from "../MenuItem";
import { useTranslation } from "react-i18next";
import { dashboardContents } from "../../../models/globalStateModel";
const ResultsWizardModal = lazy(() => import("../../results/ResultsWizardModal"));

const moduleName = "Results";
const ResultsSubMenus = inject(
  "clubModel",
  "globalStateModel",
  "sessionModel"
)(
  observer((props) => {
    const { t } = useTranslation();
    const { clubModel, globalStateModel, sessionModel } = props;
    const moduleInfo = clubModel.module("Results");
    const [addResultsWizardModalIsOpen, setAddResultsWizardModalIsOpen] = useState(false);
    const [addOldResultsWizardModalIsOpen, setAddOldResultsWizardModalIsOpen] = useState(false);

    return (
      <>
        {addResultsWizardModalIsOpen ? (
          <Suspense fallback={null}>
            <ResultsWizardModal
              open={addResultsWizardModalIsOpen}
              onClose={() => setAddResultsWizardModalIsOpen(false)}
            />
          </Suspense>
        ) : null}
        <MenuItem
          key={"menuItem#results"}
          icon={moduleName + "Icon"}
          name={t("results.Latest")}
          disabled={!sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue("rightMenuVisible", false);
            globalStateModel.setDashboard(dashboardContents.results);
          }}
        />
        <MenuItem
          key={"menuItem#resultsIndividual"}
          icon="user"
          name={t("results.Individual")}
          disabled={!sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue("rightMenuVisible", false);
            globalStateModel.setDashboard(dashboardContents.individualResults);
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
            setTimeout(() => setAddResultsWizardModalIsOpen(true), 0);
          }}
        />
        <MenuItem
          key={"menuItem#resultsFees"}
          icon="euro"
          name={t("results.FeeToClub")}
          disabled={!sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue("rightMenuVisible", false);
            globalStateModel.setDashboard(dashboardContents.resultsFees);
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
            setTimeout(() => setAddOldResultsWizardModalIsOpen(true), 0);
          }}
        />
      </>
    );
  })
);

export default ResultsSubMenus;
