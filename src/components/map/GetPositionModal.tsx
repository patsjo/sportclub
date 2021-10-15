import { Modal } from 'antd';
import { ModalFuncProps } from 'antd/lib/modal';
import { TFunction } from 'i18next';
import { IGlobalStateModel } from 'models/globalStateModel';
import { IMobxClubModel } from 'models/mobxClubModel';
import { ISessionModel } from 'models/sessionModel';
import React from 'react';
import { MobxStoreProvider } from 'utils/mobxStore';
import EsriOSMOrienteeringMap from './EsriOSMOrienteeringMap';

const { confirm } = Modal;

export const GetPositionModal = (
  t: TFunction,
  longitude: number,
  latitude: number,
  exists: boolean,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel
): Promise<{ longitude: number; latitude: number } | null> =>
  new Promise((resolve, reject) => {
    const mapCenter = [longitude, latitude];
    let selectedPosition = exists ? { longitude: longitude, latitude: latitude } : null;
    let confirmModal: {
      destroy: () => void;
      update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
    };
    // eslint-disable-next-line prefer-const
    confirmModal = confirm({
      title: t('map.SelectPosition'),
      style: { top: 40 },
      width: 500,
      content: (
        <div style={{ height: 400 }}>
          <MobxStoreProvider
            store={{
              clubModel: clubModel,
              sessionModel: sessionModel,
              globalStateModel: globalStateModel,
            }}
          >
            <EsriOSMOrienteeringMap
              key="confirm#getPositionMap"
              height="400px"
              width="100%"
              containerId="getPositionMap"
              mapCenter={mapCenter}
              defaultGraphics={
                exists ? [{ geometry: { type: 'point', longitude: longitude, latitude: latitude } }] : []
              }
              onClick={(graphicLayer, graphic) => {
                selectedPosition = graphic.geometry;
                graphicLayer.removeAll();
                graphicLayer.add(graphic);
                confirmModal.update({
                  okButtonProps: {
                    disabled: false,
                  },
                });
              }}
            />
          </MobxStoreProvider>
        </div>
      ),
      okText: t('common.Save'),
      okButtonProps: {
        disabled: !exists,
      },
      cancelText: t('common.Cancel'),
      onOk() {
        resolve(selectedPosition);
      },
      onCancel() {
        reject();
      },
    });
  });
