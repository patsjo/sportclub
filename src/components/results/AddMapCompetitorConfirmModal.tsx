import { ModalFuncProps } from 'antd/lib/modal';
import { HookAPI } from 'antd/lib/modal/useModal';
import { TFunction } from 'i18next';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { IRaceCompetitor } from '../../models/resultModel';
import { ISessionModel } from '../../models/sessionModel';
import AddMapCompetitor, { IAddLinkCompetitor, INewCompetitorForm } from './AddMapCompetitor';

export const AddMapCompetitorConfirmModal = (
  t: TFunction,
  modal: HookAPI,
  competitorId: number,
  personId: string | undefined,
  newCompetitor: INewCompetitorForm,
  classShortName: string,
  clubModel: IMobxClubModel,
  sessionModel: ISessionModel
): Promise<IRaceCompetitor | undefined> =>
  new Promise((resolve, reject) => {
    let canReject = true;
    const confirmObject: IAddLinkCompetitor = {
      competitorId: competitorId,
      newCompetitor: newCompetitor
    };
    const option =
      competitorId === -1 &&
      clubModel.raceClubs?.selectedClub?.competitorsOptions.find(opt =>
        opt.description.startsWith(`${newCompetitor.iFirstName} ${newCompetitor.iLastName} (`)
      );
    if (option) {
      confirmObject.competitorId = option.code;
    }
    let selectedTabKey = '1';
    let confirmModal: {
      destroy: () => void;
      update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
    };

    // eslint-disable-next-line prefer-const
    confirmModal = modal.confirm({
      title:
        t('results.ModalTitleMapCompetitor') + newCompetitor.iFirstName
          ? ` (${newCompetitor.iFirstName} ${newCompetitor.iLastName}, ${classShortName})`
          : '',
      content: (
        <AddMapCompetitor
          defaultActiveKey={selectedTabKey}
          addLinkCompetitor={confirmObject}
          competitorsOptions={clubModel.raceClubs?.selectedClub?.competitorsOptions ?? []}
          onTabChange={key => (selectedTabKey = key)}
          onValidate={valid =>
            confirmModal.update({
              okButtonProps: {
                disabled: !valid
              }
            })
          }
          onChange={({ competitorId, newCompetitor }) => {
            if (competitorId !== undefined) Object.assign(confirmObject, { competitorId });
            if (newCompetitor !== undefined) Object.assign(confirmObject.newCompetitor, newCompetitor);
          }}
        />
      ),
      closable: true,
      okText: t('common.Save'),
      okButtonProps: {
        disabled: true
      },
      cancelText: t('common.Skip'),
      onOk() {
        canReject = false;
        if (selectedTabKey === '1') {
          const comp =
            confirmObject.competitorId != null && confirmObject.competitorId !== -1
              ? clubModel.raceClubs?.selectedClub?.competitorById(confirmObject.competitorId)
              : undefined;
          if (
            typeof personId === 'string' &&
            personId.length > 0 &&
            comp &&
            !comp.eventorCompetitorIds.includes(parseInt(personId))
          ) {
            comp
              .addEventorId(
                clubModel.modules.find(module => module.name === 'Results')!.addUrl!,
                personId,
                sessionModel.authorizationHeader
              )
              .then(() => resolve(comp));
          } else if (comp) {
            resolve(comp);
          }
        } else {
          clubModel.raceClubs?.selectedClub
            ?.addCompetitor(
              clubModel.modules.find(module => module.name === 'Results')!.addUrl!,
              confirmObject.newCompetitor,
              sessionModel.authorizationHeader
            )
            .then(
              competitorId =>
                competitorId !== undefined && resolve(clubModel.raceClubs?.selectedClub?.competitorById(competitorId))
            );
        }
      },
      onCancel() {
        canReject = false;
        resolve(undefined);
      },
      afterClose() {
        if (canReject) reject();
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
