import React from 'react';
import EsriOSMOrienteeringMap from './EsriOSMOrienteeringMap';
import { Modal } from 'antd';
import { Provider } from 'mobx-react';

const { confirm } = Modal;

export const GetPositionModal = (t, longitude, latitude, exists, globalStateModel, clubModel) =>
  new Promise((resolve, reject) => {
    const mapCenter = [longitude, latitude];
    let selectedPosition = exists ? { longitude: longitude, latitude: latitude } : null;
    let confirmModal;
    confirmModal = confirm({
      title: t('map.SelectPosition'),
      content: (
        <div style={{ height: 400 }}>
          <Provider clubModel={clubModel} globalStateModel={globalStateModel}>
            <EsriOSMOrienteeringMap
              key="confirm#getPositionMap"
              height="400px"
              width="100%"
              globalStateModel={globalStateModel}
              clubModel={clubModel}
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
          </Provider>
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
