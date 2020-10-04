import React from "react";
import AddMapCompetitor from "./AddMapCompetitor";
import { Modal } from "antd";

const { confirm } = Modal;

export const AddMapCompetitorConfirmModal = (t, competitorId, personId, newCompetitor, classShortName, clubModel) =>
  new Promise((resolve, reject) => {
    const confirmObject = {
      competitorId: competitorId,
      newCompetitor: newCompetitor
    };
    const option =
      !competitorId &&
      clubModel.raceClubs.selectedClub.competitorsOptions.find((opt) =>
        opt.description.startsWith(`${newCompetitor.iFirstName} ${newCompetitor.iLastName} (`)
      );
    if (option) {
      confirmObject.competitorId = parseInt(option.code);
    }
    let selectedTabKey = confirmObject.competitorId ? "1" : "2";
    let confirmModal;
    confirmModal = confirm({
      title:
        t("results.ModalTitleMapCompetitor") + newCompetitor.iFirstName
          ? ` (${newCompetitor.iFirstName} ${newCompetitor.iLastName}, ${classShortName})`
          : "",
      content: (
        <AddMapCompetitor
          defaultActiveKey={selectedTabKey}
          addLinkCompetitor={confirmObject}
          competitorsOptions={clubModel.raceClubs.selectedClub.competitorsOptions}
          onTabChange={(key) => (selectedTabKey = key)}
          onValidate={(valid) =>
            confirmModal.update({
              okButtonProps: {
                disabled: !valid
              }
            })
          }
        />
      ),
      okText: t("common.Save"),
      okButtonProps: {
        disabled: true
      },
      cancelText: t("common.Cancel"),
      onOk() {
        if (selectedTabKey === "1") {
          const comp = clubModel.raceClubs.selectedClub.competitorById(confirmObject.competitorId);
          if (
            typeof personId === "string" &&
            personId.length > 0 &&
            comp &&
            !comp.eventorCompetitorIds.includes(personId)
          ) {
            comp
              .addEventorId(clubModel.modules.find((module) => module.name === "Results").addUrl, personId)
              .then(() => resolve(comp));
          } else {
            resolve(comp);
          }
        } else {
          clubModel.raceClubs.selectedClub
            .addCompetitor(
              clubModel.modules.find((module) => module.name === "Results").addUrl,
              confirmObject.newCompetitor
            )
            .then((competitorId) => resolve(clubModel.raceClubs.selectedClub.competitorById(competitorId)));
        }
      },
      onCancel() {
        reject();
      }
    });
    if (option) {
      confirmModal.update({
        okButtonProps: {
          disabled: false
        }
      });
    }
  });
