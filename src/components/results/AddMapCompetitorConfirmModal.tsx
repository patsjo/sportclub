import { Modal, ModalFuncProps } from 'antd';
import { TFunction } from 'i18next';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { IRaceCompetitor } from '../../models/resultModel';
import { ISessionModel } from '../../models/sessionModel';
import AddMapCompetitor, { IAddLinkCompetitor, INewCompetitorForm } from './AddMapCompetitor';

/** The dialog was closed with the cross: the whole input is aborted, not only this runner ("Hoppa över") */
export class CompetitorInputAborted extends Error {
  constructor() {
    super('The input of competitors was aborted');
    this.name = 'CompetitorInputAborted';
  }
}

/**
 * Maps the runner to a competitor of the club, or adds a new one. Resolves with the competitor, with undefined when
 * the runner is skipped ("Hoppa över"), and rejects with CompetitorInputAborted when the dialog is closed.
 */
export const AddMapCompetitorConfirmModal = (
  t: TFunction,
  modal: ReturnType<typeof Modal.useModal>[0],
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
    // "Koppla" maps the runner to a competitor, "Spara" saves a new competitor
    const okText = (tabKey: string) => (tabKey === '1' ? t('results.MapCompetitorOk') : t('common.Save'));
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
          onTabChange={key => {
            selectedTabKey = key;
            confirmModal.update({ okText: okText(key) });
          }}
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
      okText: okText(selectedTabKey),
      okButtonProps: {
        disabled: true
      },
      cancelText: t('common.Skip'),
      cancelButtonProps: {
        // Skips this runner. A click of its own, antd calls onCancel for the cross as well.
        onClick: () => {
          canReject = false;
          resolve(undefined);
          confirmModal.destroy();
        }
      },
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
      // The cross (or Esc)
      onCancel() {
        canReject = false;
        reject(new CompetitorInputAborted());
      },
      afterClose() {
        if (canReject) reject(new CompetitorInputAborted());
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
