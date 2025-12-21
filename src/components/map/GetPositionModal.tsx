import { ModalFuncProps } from 'antd/lib/modal';
import { HookAPI } from 'antd/lib/modal/useModal';
import { TFunction } from 'i18next';
import { toLonLat } from 'ol/proj';
import { Icon, Style } from 'ol/style';
import { IGlobalStateModel } from '../../models/globalStateModel';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { ISessionModel } from '../../models/sessionModel';
import { MobxStoreProvider } from '../../utils/mobxStore';
import OSMOrienteeringMap, { OrienteeringSymbol } from './OSMOrienteeringMap';
import { mapProjection } from './useOpenLayersMap';

export const GetPositionModal = (
  t: TFunction,
  modal: HookAPI,
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
    confirmModal = modal.confirm({
      title: t('map.SelectPosition'),
      style: { top: 40 },
      width: 500,
      content: (
        <div style={{ height: 400 }}>
          <MobxStoreProvider
            store={{
              clubModel: clubModel,
              sessionModel: sessionModel,
              globalStateModel: globalStateModel
            }}
          >
            <OSMOrienteeringMap
              key="confirm#getPositionMap"
              height="400px"
              width="100%"
              containerId="getPositionMap"
              mapCenter={mapCenter}
              defaultGraphics={
                exists ? [{ geometry: { type: 'point', longitude: longitude, latitude: latitude } }] : []
              }
              onClick={(graphicLayer, graphic) => {
                const coordinates = toLonLat(graphic.getGeometry()!.getCoordinates(), mapProjection);
                graphic.setStyle(
                  new Style({
                    image: new Icon({
                      src: OrienteeringSymbol.url,
                      scale: 15 / OrienteeringSymbol.width,
                      size: [OrienteeringSymbol.width, OrienteeringSymbol.height]
                    })
                  })
                );
                selectedPosition = { longitude: coordinates[0], latitude: coordinates[1] };
                graphicLayer.getSource()?.clear();
                graphicLayer.getSource()?.addFeature(graphic);
                confirmModal.update({
                  okButtonProps: {
                    disabled: false
                  }
                });
              }}
            />
          </MobxStoreProvider>
        </div>
      ),
      okText: t('common.Save'),
      okButtonProps: {
        disabled: !exists
      },
      cancelText: t('common.Cancel'),
      onOk() {
        resolve(selectedPosition);
      },
      onCancel() {
        reject();
      }
    });
  });
