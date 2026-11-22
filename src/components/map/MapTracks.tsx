import { UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, message, Modal, Space, Splitter, Upload } from 'antd';
import Map from 'ol/Map';
import { unByKey } from 'ol/Observable';
import { toLonLat } from 'ol/proj';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import { IExtentProps } from '../../models/mobxClubModel';
import { PostJsonData } from '../../utils/api';
import { parseGpx } from '../../utils/gpxUtils';
import { useMobxStore } from '../../utils/mobxStore';
import { useSize } from '../../utils/useSize';
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
  height: calc(100vh - 88px);
  width: 100%;
`;

const ContentArea = styled.div`
  &&& {
    margin-top: 20px;
    margin-left: 20px;
    margin-right: 0px;
    overflow: hidden;
    @media screen and (max-width: 699px) {
      margin-left: 12px;
      margin-right: 6px;
    }
  }
`;
type SplitterLayout = 'vertical' | 'horizontal';
interface IListSize {
  size: number;
  /** Only a phone can fold away a panel */
  mapCollapsed: boolean;
}
type ListSizes = Partial<Record<SplitterLayout, IListSize>>;

// The dragged size of the list is remembered to the next visit, on a phone and a bigger screen separately
const listSizesStorageKey = 'mapTracksListSizes';
const readListSizes = (): ListSizes => {
  try {
    const saved = JSON.parse(localStorage.getItem(listSizesStorageKey) ?? '{}');
    const listSizes: ListSizes = {};
    (['vertical', 'horizontal'] as const).forEach(layout => {
      const size = saved?.[layout]?.size;
      if (typeof size === 'number' && size > 0) listSizes[layout] = { size, mapCollapsed: false };
    });
    return listSizes;
  } catch {
    return {};
  }
};
const writeListSize = (layout: SplitterLayout, size: number) => {
  try {
    localStorage.setItem(listSizesStorageKey, JSON.stringify({ ...readListSizes(), [layout]: { size } }));
  } catch {
    // Not possible to remember, e.g. a private window
  }
};

// A panel can't be dragged smaller than this, on a phone both the list and the map stay usable
const minPanelSize = 250;
// The gap beside the divider is padding (inside the size the splitter sets), a margin made the panels overflow
// Where the splitter is, measured to keep the list size in pixels.
// dvh is the visible height on a phone (vh includes the area behind the browser bars).
const SplitterArea = styled.div`
  position: absolute;
  top: 64px;
  left: 0;
  width: 100%;
  height: calc(100dvh - 64px);
`;
const StyledSplitter = styled(Splitter)<{ vertical: boolean }>`
  &&& .list-panel {
    padding-right: ${props => (props.vertical ? '0' : '6px')};
    padding-bottom: ${props => (props.vertical ? '6px' : '0')};
  }
  &&& .map-panel {
    padding-left: ${props => (props.vertical ? '0' : '6px')};
    padding-top: ${props => (props.vertical ? '6px' : '0')};
  }
`;

const MapTracks = () => {
  const { t } = useTranslation();
  const { globalStateModel, clubModel, sessionModel } = useMobxStore();
  const [form] = Form.useForm<IMapTracksFormProps>();
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useSize(ref, true, true);
  const splitterAreaRef = useRef<HTMLDivElement>(null);
  const splitterArea = useSize(splitterAreaRef, true, true);
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
  const [layerTrackIds, setLayerTrackIds] = useState<string[]>([]);
  const getTrackLayers = useCallback(
    () => map?.getAllLayers()?.filter(l => l.getProperties().id?.startsWith('track-')) ?? [],
    [map]
  );
  const subscribeToTrackVisibility = useCallback(
    (onStoreChange: () => void) => {
      if (!map || editable) return () => undefined;
      const keys = getTrackLayers()
        .filter(layer => layerTrackIds.includes(layer.getProperties().id))
        .map(layer => layer.on('change:visible', onStoreChange));
      return () => unByKey(keys);
    },
    [editable, getTrackLayers, layerTrackIds, map]
  );
  const getVisibleTrackIdsSnapshot = useCallback(() => {
    if (!map || editable) return '';
    const layers = getTrackLayers();
    return layerTrackIds
      .filter(trackId => layers.find(layer => layer.getProperties().id === trackId)?.getVisible())
      .join(',');
  }, [editable, getTrackLayers, layerTrackIds, map]);
  const visibleTrackIdsKey = useSyncExternalStore(subscribeToTrackVisibility, getVisibleTrackIdsSnapshot);
  const visibleTrackIds = useMemo(
    () => (visibleTrackIdsKey ? visibleTrackIdsKey.split(',') : []),
    [visibleTrackIdsKey]
  );
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
    return clubModel.map?.fullExtent.xmin &&
      clubModel.map?.fullExtent.ymin &&
      clubModel.map?.fullExtent.xmax &&
      clubModel.map?.fullExtent.ymax
      ? clubModel.map?.fullExtent
      : undefined;
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
  const isVertical = useMemo(() => width !== undefined && width < 700, [width]);
  const layout: SplitterLayout = isVertical ? 'vertical' : 'horizontal';
  // The size the list got by dragging, kept in pixels when the window is resized (not in % as antd does)
  const [draggedListSizes, setDraggedListSizes] = useState<ListSizes>(readListSizes);
  const listMinSize = isVertical ? minPanelSize : 400;
  const listMaxSize = isVertical ? undefined : 1000;
  const splitterSize = isVertical ? splitterArea.height : splitterArea.width;
  const listSize = useMemo(() => {
    if (splitterSize === undefined) return undefined;
    const dragged = draggedListSizes[layout];
    if (dragged?.size === 0) return 0;
    if (dragged?.mapCollapsed) return splitterSize;
    // At start 35% of the screen. Never outside the limits, the map keeps at least minPanelSize.
    const size = dragged?.size ?? Math.round(splitterSize * 0.35);
    const maxSize = Math.min(listMaxSize ?? splitterSize, splitterSize - minPanelSize);
    return Math.max(listMinSize, Math.min(size, maxSize));
  }, [draggedListSizes, layout, listMaxSize, listMinSize, splitterSize]);

  const onRemove = useCallback(
    (trackId: string | string[], index: number | number[], removeFn: (index: number | number[]) => void) => {
      removeFn(index);
      const idsToRemove = Array.isArray(trackId) ? trackId : [trackId];
      setRemovedTrackIds(prev => [...prev, ...idsToRemove]);
    },
    []
  );

  const toggleGroupLayerVisibility = useCallback(
    (trackCenter: string, checked: boolean) => {
      if (!map || !trackCenter) return;
      const groupLayerId = `track-group-${trackCenter}`;
      const allMapLayers = map.getAllLayers()?.filter(l => l.getProperties().id) ?? [];
      const groupLayer = allMapLayers.find(l => l.getProperties().id === groupLayerId);
      if (groupLayer) groupLayer.setVisible(checked);
      (tracks ?? [])
        .filter(t => t.trackCenter === trackCenter)
        .forEach(track => {
          const layerId = `track-${track.trackId}`;
          const layer = allMapLayers.find(l => l.getProperties().id === layerId);
          if (layer) layer.setVisible(checked);
        });
    },
    [map, tracks]
  );

  const toggleLayerVisibility = useCallback(
    (trackId: string) => {
      if (!map || !trackId) return;
      const layerId = `track-${trackId}`;
      const allMapLayers = map.getAllLayers()?.filter(l => l.getProperties().id) ?? [];
      const layer = allMapLayers.find(l => l.getProperties().id === layerId);
      if (layer) layer.setVisible(!layer.getVisible());
    },
    [map]
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
    setEditTrackIds([]);
  }, [form, initialValues]);
  const saveUrl = clubModel.map?.saveUrl;
  const onSave = useCallback(
    async (values: IMapTracksFormProps) => {
      setSaving(true);
      try {
        if (!saveUrl) return;
        const json = await PostJsonData<IMapTracksFormProps & { removedTrackIds: string[] }>(
          saveUrl,
          {
            tracks: values.tracks,
            removedTrackIds
          },
          true,
          sessionModel.authorizationHeader
        );
        if (json) {
          setLoadedValues(json.tracks);
          setRemovedTrackIds([]);
        }
        setEditable(false);
        setEditTrackIds([]);
      } catch (e) {
        if (e && (e as { message: string }).message) message.error((e as { message: string }).message);
      } finally {
        setSaving(false);
      }
    },
    [removedTrackIds, saveUrl, sessionModel.authorizationHeader]
  );

  useEffect(() => {
    if (!map) return;
    const allMapLayers = map.getLayers();
    const keys = allMapLayers.on(['add', 'remove'], () => {
      const allMapLayers = map.getAllLayers()?.filter(l => l.getProperties().id?.startsWith('track-')) ?? [];
      setLayerTrackIds(old => (old.length === allMapLayers.length ? old : allMapLayers.map(l => l.getProperties().id)));
    });
    return () => {
      unByKey(keys);
    };
  }, [map]);

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

  if (clubModel.map?.requireLogin && !sessionModel.loggedIn) {
    return <div>{t('map.requireLogin')}</div>;
  }

  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <MapContainer ref={ref}>
        <Form.List name="tracks">
          {(fields, { add, remove }) => (
            <SplitterArea ref={splitterAreaRef}>
              {listSize === undefined ? null : (
                <StyledSplitter
                  vertical={isVertical}
                  style={{ height: '100%', width: '100%' }}
                  onResize={sizes =>
                    setDraggedListSizes(previous => ({
                      ...previous,
                      [layout]: { size: sizes[0], mapCollapsed: isVertical && sizes[1] === 0 }
                    }))
                  }
                  // A folded away panel isn't remembered, the next visit shows both again
                  onResizeEnd={sizes => {
                    if (sizes[0] > 0 && sizes[1] > 0) writeListSize(layout, Math.round(sizes[0]));
                  }}
                >
                  <Splitter.Panel
                    // Only a phone can fold away a panel, on a bigger screen the limits always apply
                    collapsible={isVertical}
                    className="list-panel"
                    size={listSize}
                    min={listMinSize}
                    max={listMaxSize}
                  >
                    <ContentArea>
                      <FullScreenWizard
                        title={t('map.Tracks')}
                        height="100%"
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
                                  <Button
                                    key="editButton"
                                    disabled={!width || !height || width < 1200 || height < 800}
                                    type="primary"
                                    onClick={() => setEditable(true)}
                                  >
                                    {t('common.Edit')}
                                  </Button>
                                ]
                              : undefined
                        }
                      >
                        <Space vertical style={{ display: 'flex' }}>
                          {editable ? (
                            <>
                              <Alert showIcon title={t('map.createTrackByStartDrawInMap')} type="info" />
                              <Upload
                                accept=".gpx"
                                showUploadList={false}
                                fileList={[]}
                                style={{ width: '100%' }}
                                beforeUpload={async file => {
                                  try {
                                    const geometry = await parseGpx(file);
                                    add({
                                      trackId: uuidv4(),
                                      line: geometry,
                                      symbolSvg: undefined,
                                      showByDefault: false,
                                      orderBy: tracks?.length ?? 0
                                    });
                                    message.success(t('map.gpxImported'));
                                  } catch (e) {
                                    if (e && (e as { message: string }).message)
                                      message.error((e as { message: string }).message);
                                  }
                                  return false;
                                }}
                              >
                                <Button block type="dashed" size="large" icon={<UploadOutlined />}>
                                  {t('map.uploadGpx')}
                                </Button>
                              </Upload>
                            </>
                          ) : null}
                          {fields.map(field => (
                            <MapTrack
                              key={`map-track-${form.getFieldValue(['tracks', field.name, 'trackId'])}`}
                              map={map}
                              form={form}
                              field={field}
                              defaultTrackMarkings={defaultTrackMarkings}
                              visibleTrackIds={visibleTrackIds}
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
                              toggleLayerVisibility={toggleLayerVisibility}
                              toggleGroupLayerVisibility={toggleGroupLayerVisibility}
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
                  <Splitter.Panel className="map-panel" collapsible={isVertical} min={minPanelSize}>
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
                          key="editableTracks"
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
                        <MapTracksLayers key="nonEditableTracks" onLoad={setLoadedValues} />
                      )}
                    </OSMOrienteeringMap>
                  </Splitter.Panel>
                </StyledSplitter>
              )}
            </SplitterArea>
          )}
        </Form.List>
      </MapContainer>
    </Form>
  );
};

export default MapTracks;
