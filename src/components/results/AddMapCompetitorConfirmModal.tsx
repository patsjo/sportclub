import { Modal } from 'antd';
import { ModalFuncProps } from 'antd/lib/modal';
import { TFunction } from 'i18next';
import { IMobxClubModel } from 'models/mobxClubModel';
import { IRaceCompetitor } from 'models/resultModel';
import { ISessionModel } from 'models/sessionModel';
import React from 'react';
import AddMapCompetitor, { IAddLinkCompetitor, INewCompetitorForm } from './AddMapCompetitor';

const { confirm } = Modal;

export const AddMapCompetitorConfirmModal = (
  t: TFunction,
  competitorId: number,
  personId: string | undefined,
  newCompetitor: INewCompetitorForm,
  classShortName: string,
  clubModel: IMobxClubModel,
  sessionModel: ISessionModel
): Promise<IRaceCompetitor | undefined> =>
  new Promise((resolve, reject) => {
    const confirmObject: IAddLinkCompetitor = {
      competitorId: competitorId,
      newCompetitor: newCompetitor,
    };
    const option =
      competitorId === -1 &&
      clubModel.raceClubs?.selectedClub.competitorsOptions.find((opt) =>
        opt.description.startsWith(`${newCompetitor.iFirstName} ${newCompetitor.iLastName} (`)
      );
    if (option) {
      confirmObject.competitorId = option.code;
    }
    let selectedTabKey = confirmObject.competitorId !== -1 ? '1' : '2';
    let confirmModal: {
      destroy: () => void;
      update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
    };
    // eslint-disable-next-line prefer-const
    confirmModal = confirm({
      title:
        t('results.ModalTitleMapCompetitor') + newCompetitor.iFirstName
          ? ` (${newCompetitor.iFirstName} ${newCompetitor.iLastName}, ${classShortName})`
          : '',
      content: (
        <AddMapCompetitor
          defaultActiveKey={selectedTabKey}
          addLinkCompetitor={confirmObject}
          competitorsOptions={clubModel.raceClubs?.selectedClub.competitorsOptions ?? []}
          onTabChange={(key) => (selectedTabKey = key)}
          onValidate={(valid) =>
            confirmModal.update({
              okButtonProps: {
                disabled: !valid,
              },
            })
          }
        />
      ),
      okText: t('common.Save'),
      okButtonProps: {
        disabled: true,
      },
      cancelText: t('common.Cancel'),
      onOk() {
        if (selectedTabKey === '1') {
          const comp =
            confirmObject.competitorId != null && confirmObject.competitorId !== -1
              ? clubModel.raceClubs?.selectedClub.competitorById(confirmObject.competitorId)
              : undefined;
          if (
            typeof personId === 'string' &&
            personId.length > 0 &&
            comp &&
            !comp.eventorCompetitorIds.includes(parseInt(personId))
          ) {
            comp
              .addEventorId(
                clubModel.modules.find((module) => module.name === 'Results')!.addUrl!,
                personId,
                sessionModel.authorizationHeader
              )
              .then(() => resolve(comp));
          } else if (comp) {
            resolve(comp);
          }
        } else {
          clubModel.raceClubs?.selectedClub
            .addCompetitor(
              clubModel.modules.find((module) => module.name === 'Results')!.addUrl!,
              confirmObject.newCompetitor,
              sessionModel.authorizationHeader
            )
            .then(
              (competitorId) =>
                competitorId !== undefined && resolve(clubModel.raceClubs?.selectedClub.competitorById(competitorId))
            );
        }
      },
      onCancel() {
        reject();
      },
    });
    if (option) {
      confirmModal.update({
        okButtonProps: {
          disabled: false,
        },
      });
    }
  });
