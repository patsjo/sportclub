import { Button, Form, Input, message, Modal, Space, Splitter } from 'antd';
import Map from 'ol/Map';
import { toLonLat } from 'ol/proj';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import { IExtentProps } from '../../models/mobxClubModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import FullScreenWizard from '../styled/FullscreenWizard';
import EditableMapTracksLayer from './EditableMapTracksLayer';
import MapTrack, { IMapTracksFormProps } from './MapTrack';
import MapTracksLayers, { getExtent } from './MapTracksLayers';
import OSMOrienteeringMap from './OSMOrienteeringMap';
import cirkle from './trackMarkings/cirkle.svg?raw';
import cirkleLeftWhite from './trackMarkings/cirkleLeftWhite.svg?raw';
import cirkleLowerRightWhite from './trackMarkings/cirkleLowerRightWhite.svg?raw';
import cirkleRightWhite from './trackMarkings/cirkleRightWhite.svg?raw';
import cirkleUpperLeftWhite from './trackMarkings/cirkleUpperLeftWhite.svg?raw';
import dimond from './trackMarkings/dimond.svg?raw';
import dimondLeftWhite from './trackMarkings/dimondLeftWhite.svg?raw';
import dimondLowerRightWhite from './trackMarkings/dimondLowerRightWhite.svg?raw';
import dimondRightWhite from './trackMarkings/dimondRightWhite.svg?raw';
import dimondUpperLeftWhite from './trackMarkings/dimondUpperLeftWhite.svg?raw';
import { mapProjection } from './useOpenLayersMap';

const MapContainer = styled.div`
  height: 100%;
  width: 100%;
`;

const ContentArea = styled.div`
  & {
    margin-top: 20px;
    margin-left: 20px;
    margin-right: 0px;
    overflow: hidden;
  }
`;

const MapTracks = () => {
  const { t } = useTranslation();
  const { globalStateModel, clubModel, sessionModel } = useMobxStore();
  const [form] = Form.useForm<IMapTracksFormProps>();
  const tracks = Form.useWatch('tracks', form);
  const [map, setMap] = useState<Map>();
  const [loadedValues, setLoadedValues] = useState<IMapTracksFormProps['tracks']>();
  const [removedTrackIds, setRemovedTrackIds] = useState<string[]>([]);
  const [editable, setEditable] = useState(false);
  const [submittable, setSubmittable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [svgModalVisible, setSvgModalVisible] = useState(false);
  const [editingSvg, setEditingSvg] = useState<string | undefined>(undefined);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTrackIds, setEditTrackIds] = useState<string[]>([]);
  const initialValues = useMemo(
    () =>
      loadedValues
        ?.reduce(
          (map, t) => {
            const item = map.find(g => g.trackCenter === t.trackCenter);
            if (!item) map.push({ trackCenter: t.trackCenter, tracks: [t], minOrder: t.orderBy });
            else {
              item.tracks.push(t);
              item.minOrder = Math.min(item.minOrder, t.orderBy);
            }
            return map;
          },
          [] as { trackCenter: string; tracks: typeof loadedValues; minOrder: number }[]
        )
        ?.sort((a, b) => a.minOrder - b.minOrder)
        ?.map(g => g.tracks)
        ?.flat(),
    [loadedValues]
  );
  const defaultExtent = useMemo((): IExtentProps | undefined => {
    if (initialValues?.length) {
      let extent = getExtent(initialValues.map(t => t.line));
      if (extent?.length === 4) {
        const xyMin = toLonLat([extent[0], extent[1]], mapProjection);
        const xyMax = toLonLat([extent[2], extent[3]], mapProjection);
        extent = [...xyMin, ...xyMax];
        return { xmin: extent[0], ymin: extent[1], xmax: extent[2], ymax: extent[3] };
      }
    }
    return clubModel.map?.fullExtent;
  }, [clubModel.map?.fullExtent, initialValues]);
  const defaultTrackMarkings = useMemo(
    () => [
      { value: 'dimond', label: t('map.dimond'), svg: dimond },
      {
        value: 'dimondLowerRightWhite',
        label: t('map.dimondLowerRightWhite'),
        svg: dimondLowerRightWhite
      },
      { value: 'dimondUpperLeftWhite', label: t('map.dimondUpperLeftWhite'), svg: dimondUpperLeftWhite },
      { value: 'dimondRightWhite', label: t('map.dimondRightWhite'), svg: dimondRightWhite },
      { value: 'dimondLeftWhite', label: t('map.dimondLeftWhite'), svg: dimondLeftWhite },
      { value: 'cirkle', label: t('map.cirkle'), svg: cirkle },
      {
        value: 'cirkleLowerRightWhite',
        label: t('map.cirkleLowerRightWhite'),
        svg: cirkleLowerRightWhite
      },
      { value: 'cirkleUpperLeftWhite', label: t('map.cirkleUpperLeftWhite'), svg: cirkleUpperLeftWhite },
      { value: 'cirkleRightWhite', label: t('map.cirkleRightWhite'), svg: cirkleRightWhite },
      { value: 'cirkleLeftWhite', label: t('map.cirkleLeftWhite'), svg: cirkleLeftWhite }
    ],
    [t]
  );

  const onRemove = useCallback(
    (trackId: string | string[], index: number | number[], removeFn: (index: number | number[]) => void) => {
      removeFn(index);
      const idsToRemove = Array.isArray(trackId) ? trackId : [trackId];
      setRemovedTrackIds(prev => [...prev, ...idsToRemove]);
    },
    []
  );

  const move = useCallback(
    (from: number, to: number) => {
      if (!tracks) return;
      const newTracks = [...tracks];
      const [item] = newTracks.splice(from, 1);
      newTracks.splice(to, 0, item);
      newTracks.forEach((t, i) => (t.orderBy = i));
      form.setFieldValue('tracks', newTracks);
    },
    [tracks, form]
  );
  const moveUp = useCallback(
    (i: number) => {
      if (!tracks || i <= 0) return;
      move(i, i - 1);
    },
    [move, tracks]
  );
  const moveDown = useCallback(
    (i: number) => {
      if (!tracks || i >= (tracks.length ?? 0) - 1) return;
      move(i, i + 1);
    },
    [move, tracks]
  );
  const onCancel = useCallback(() => {
    if (initialValues) form.setFieldsValue({ tracks: initialValues });
    else form.resetFields();
    setEditable(false);
  }, [form, initialValues]);
  const onSave = useCallback(
    async (values: IMapTracksFormProps) => {
      setSaving(true);
      try {
        const saveUrl = clubModel.map?.saveUrl;
        if (!saveUrl) return;
        const json = await PostJsonData<IMapTracksFormProps & { removedTrackIds: string[] }>(
          saveUrl,
          {
            tracks: values.tracks,
            removedTrackIds,
            username: sessionModel.username,
            password: sessionModel.password
          },
          true,
          sessionModel.authorizationHeader
        );
        if (json) {
          setLoadedValues(json.tracks);
          setRemovedTrackIds([]);
        }
        setEditable(false);
      } catch (e) {
        if (e && (e as { message: string }).message) message.error((e as { message: string }).message);
      } finally {
        setSaving(false);
      }
    },
    [
      clubModel.map?.saveUrl,
      removedTrackIds,
      sessionModel.authorizationHeader,
      sessionModel.password,
      sessionModel.username
    ]
  );

  useEffect(() => {
    if (form && initialValues) form.setFieldsValue({ tracks: initialValues });
    globalStateModel.setGraphics(['calendar', 'event'], []);
  }, [form, globalStateModel, initialValues]);

  useEffect(() => {
    form
      .validateFields()
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, tracks]);

  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <MapContainer>
        <Form.List name="tracks">
          {(fields, { add, remove }) => (
            <Splitter style={{ position: 'absolute', top: 64, left: 0, height: 'calc(100vh - 64px)', width: '100vw' }}>
              <Splitter.Panel collapsible defaultSize={700} min={400} max={1000} style={{ marginRight: 6 }}>
                <ContentArea>
                  <FullScreenWizard
                    title={t('map.Tracks')}
                    footer={
                      editable
                        ? [
                            <Button
                              key="saveButton"
                              type="primary"
                              disabled={!submittable || saving}
                              loading={saving}
                              onClick={() => {
                                form.validateFields().then(values => {
                                  onSave(values);
                                });
                              }}
                            >
                              {t('common.Save')}
                            </Button>,
                            <Button key="cancelButton" loading={false} onClick={onCancel}>
                              {t('common.Cancel')}
                            </Button>
                          ]
                        : sessionModel.isAdmin
                          ? [
                              <Button key="editButton" type="primary" onClick={() => setEditable(true)}>
                                {t('common.Edit')}
                              </Button>
                            ]
                          : undefined
                    }
                  >
                    <Space vertical style={{ display: 'flex' }}>
                      {fields.map(field => (
                        <MapTrack
                          key={`map-track-${form.getFieldValue(['tracks', field.name, 'trackId'])}`}
                          map={map}
                          form={form}
                          field={field}
                          defaultTrackMarkings={defaultTrackMarkings}
                          editable={editable}
                          remove={(trackId: string | string[], index: number | number[]) =>
                            onRemove(trackId, index, remove)
                          }
                          moveUp={moveUp}
                          moveDown={moveDown}
                          setSvgModalVisible={setSvgModalVisible}
                          setEditingSvg={setEditingSvg}
                          setEditingIndex={setEditingIndex}
                          setEditTrackIds={setEditTrackIds}
                        />
                      ))}
                    </Space>
                    {editable ? (
                      <Modal
                        title={t('map.EditSvg') || 'Edit SVG'}
                        open={svgModalVisible}
                        onOk={() => {
                          if (editingIndex !== null) {
                            form.setFieldValue(['tracks', editingIndex, 'symbolSvg'], editingSvg);
                          }
                          setSvgModalVisible(false);
                          setEditingIndex(null);
                        }}
                        onCancel={() => {
                          setSvgModalVisible(false);
                          setEditingIndex(null);
                        }}
                      >
                        <Input.TextArea
                          value={editingSvg}
                          autoSize={{ minRows: 4, maxRows: 20 }}
                          onChange={e => setEditingSvg(e.target.value)}
                        />
                      </Modal>
                    ) : null}
                  </FullScreenWizard>
                </ContentArea>
              </Splitter.Panel>
              <Splitter.Panel collapsible style={{ marginLeft: 6 }}>
                <OSMOrienteeringMap
                  key="mapOnly"
                  useAllWidgets
                  height="100%"
                  width="100%"
                  containerId="mapOnly"
                  mapCenter={clubModel.map?.center}
                  defaultExtent={defaultExtent}
                  onLoaded={setMap}
                >
                  {editable ? (
                    <EditableMapTracksLayer
                      tracks={tracks}
                      editTrackIds={editTrackIds}
                      onDrawComplete={geometry =>
                        add({
                          trackId: uuidv4(),
                          line: geometry,
                          symbolSvg: undefined,
                          showByDefault: false,
                          orderBy: tracks?.length ?? 0
                        })
                      }
                      onModifyComplete={features =>
                        features.forEach(feature => {
                          const index = tracks.findIndex(track => track.trackId === feature.trackId);
                          if (index >= 0) form.setFieldValue(['tracks', index, 'line'], feature.geometry);
                        })
                      }
                    />
                  ) : (
                    <MapTracksLayers onLoad={setLoadedValues} />
                  )}
                </OSMOrienteeringMap>
              </Splitter.Panel>
            </Splitter>
          )}
        </Form.List>
      </MapContainer>
    </Form>
  );
};

export default MapTracks;
