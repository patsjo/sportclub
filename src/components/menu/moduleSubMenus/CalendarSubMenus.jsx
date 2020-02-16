import React, { useState } from "react";
import { inject, observer } from "mobx-react";
import PropTypes from "prop-types";
import MenuItem from "../MenuItem";
import { useTranslation } from "react-i18next";
import { dashboardContents } from "../../../models/globalStateModel";
import EventSelectorWizardModal from "../../calendar/eventSelector/EventSelectorWizardModal";

const moduleName = "Calendar";
const CalendarSubMenus = inject(
  "clubModel",
  "globalStateModel",
  "sessionModel"
)(
  observer(props => {
    const { t } = useTranslation();
    const { clubModel, globalStateModel, sessionModel } = props;
    const moduleInfo = clubModel.module("Calendar");
    const resultsInfo = clubModel.module("Results");
    const [eventSelectorWizardModalIsOpen, setEventSelectorWizardModalIsOpen] = useState(false);

    return (
      <>
        {eventSelectorWizardModalIsOpen ? (
          <EventSelectorWizardModal
            open={eventSelectorWizardModalIsOpen}
            onClose={() => setEventSelectorWizardModalIsOpen(false)}
          />
        ) : null}
        <MenuItem
          key={"menuItem#calendar"}
          icon={moduleName + "Icon"}
          name={t("calendar.Calendar")}
          disabled={true}
          isSubMenu
          onClick={() => {
            globalStateModel.setDashboard(dashboardContents.calendar, "1990-01-01", "2099-12-31", 1);
          }}
        />
        <MenuItem
          key={"menuItem#calendarEventSelector"}
          icon="star"
          name={t("calendar.EventSelector")}
          disabled={!moduleInfo.addUrl || !resultsInfo.queryUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue("rightMenuVisible", false);
            setEventSelectorWizardModalIsOpen(true);
          }}
        />
      </>
    );
  })
);

CalendarSubMenus.propTypes = {
  moduleName: PropTypes.string.isRequired
};

export default CalendarSubMenus;
