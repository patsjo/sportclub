import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  CopyOutlined,
  SearchOutlined,
  StopOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Col,
  ColorPicker,
  ColorPickerProps,
  Flex,
  Form,
  FormInstance,
  FormListFieldData,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Typography
} from 'antd';
import { buffer, getSize } from 'ol/extent';
import { LineString } from 'ol/geom';
import Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import { getLength } from 'ol/sphere.js';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { ILineStringGeometry } from '../../models/graphic';
import { errorRequiredField } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
import { getFillColorsFromSvg } from './EditableMapTracksLayer';
import { mapProjection } from './useOpenLayersMap';
import ViewText from './ViewText';

type PresetsItem = Required<ColorPickerProps>['presets'][number];
const Title = Typography.Title;

export interface IMapTracksFormProps {
  tracks: {
    trackId: string;
    name: string;
    trackCenter: string;
    description: string | undefined;
    line: ILineStringGeometry;
    showByDefault?: boolean;
    symbolSvg: string | undefined;
    orderBy: number;
  }[];
}

interface IMapTracksProps {
  form: FormInstance<IMapTracksFormProps>;
  field: FormListFieldData;
  defaultTrackMarkings: {
    value: string;
    label: string;
    svg: string;
  }[];
  editable: boolean;
  map: Map | undefined;
  visibleTrackIds: string[];
  remove: (trackId: string | string[], index: number | number[]) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  setSvgModalVisible: (visible: boolean) => void;
  setEditingSvg: (svg: string | undefined) => void;
  setEditingIndex: (index: number | null) => void;
  setEditTrackIds: (updateFn: (oldIds: string[]) => string[]) => void;
  toggleLayerVisibility: (trackId: string) => void;
  toggleGroupLayerVisibility: (trackCenter: string, checked: boolean) => void;
}

const MapTrack = ({
  form,
  field,
  defaultTrackMarkings,
  editable,
  map,
  visibleTrackIds,
  remove,
  moveUp,
  moveDown,
  setSvgModalVisible,
  setEditingSvg,
  setEditingIndex,
  setEditTrackIds,
  toggleLayerVisibility,
  toggleGroupLayerVisibility
}: IMapTracksProps) => {
  const { t } = useTranslation();
  const tracks = Form.useWatch('tracks', form);
  const trackId = Form.useWatch(['tracks', field.name, 'trackId'], form);
  const trackCenter = Form.useWatch(['tracks', field.name, 'trackCenter'], form);
  const prevTrackCenter = field.name > 0 ? tracks?.[field.name - 1].trackCenter : undefined;
  const layerVisible = useMemo(
    () => !editable && visibleTrackIds.includes(`track-${trackId}`),
    [editable, trackId, visibleTrackIds]
  );
  const layerGroupVisible = useMemo(
    () =>
      !editable &&
      (tracks ?? [])
        .filter(t => t.trackCenter === trackCenter)
        .reduce(
          (acc, t, index) =>
            acc === 'indeterminate'
              ? acc
              : visibleTrackIds.includes(`track-${t.trackId}`)
                ? acc === true || index === 0
                  ? true
                  : 'indeterminate'
                : acc === false
                  ? false
                  : 'indeterminate',
          false as boolean | 'indeterminate'
        ),
    [editable, tracks, trackCenter, visibleTrackIds]
  );
  const line = Form.useWatch(['tracks', field.name, 'line'], form);
  const svgString = Form.useWatch(['tracks', field.name, 'symbolSvg'], form);
  const lineString = line
    ? new LineString(
        line.path.map(coordinate => fromLonLat([coordinate.longitude, coordinate.latitude], mapProjection))
      )
    : undefined;
  const lineLengthKm = lineString ? (getLength(lineString) / 1000).toFixed(1) : '0.0';
  const lineLength = lineString ? getLength(lineString).toFixed(0) : '0';
  const fillColors = useMemo(() => getFillColorsFromSvg(svgString), [svgString]);
  const presets = useMemo(
    (): PresetsItem[] => [
      {
        key: 'presetPalettes',
        label: t('map.defaultPalette'),
        colors: ['#ffffff', '#000000', '#003080', '#A00000', '#E0D030', '#308000', '#8000C0', '#C05000'],
        defaultOpen: true
      }
    ],
    [t]
  );
  const getUpdatedSvgFillColor = useCallback((svg: string | undefined, index: number, newColor: string | undefined) => {
    if (!svg) return;
    let i = -1;
    const updated = svg.replace(/fill=(['"])(&(#[0-9a-fA-F]{3,6})|#[0-9a-fA-F]{3,6})\1/g, (match, quote) => {
      i += 1;
      if (i === index) {
        if (!newColor) return '';
        return `fill=${quote}${newColor}${quote}`;
      }
      return match;
    });
    return updated;
  }, []);
  const updateFillColor = useCallback(
    (index: number, newColor: string | undefined) => {
      if (!svgString) return;
      const updated = getUpdatedSvgFillColor(svgString, index, newColor);
      if (updated) form.setFieldValue(['tracks', field.name, 'symbolSvg'], updated);
    },
    [svgString, getUpdatedSvgFillColor, form, field.name]
  );

  const copyTrack = useCallback(() => {
    const item = form.getFieldValue(['tracks', field.name]) as IMapTracksFormProps['tracks'][number];
    if (!item) return;
    const copied = {
      ...item,
      trackId: uuidv4()
    };
    const newTracks = [...tracks.slice(0, field.name + 1), copied, ...tracks.slice(field.name + 1)];
    newTracks.forEach((t, i) => (t.orderBy = i));
    form.setFieldsValue({ tracks: newTracks });
  }, [form, field.name, tracks]);

  const onZoomToTrack = useCallback(() => {
    if (!line?.path || !map) return;
    const geometry = new LineString(
      line.path.map(coordinate => fromLonLat([coordinate.longitude, coordinate.latitude], mapProjection))
    );
    const geometryExtent = geometry.getExtent();
    const size = geometryExtent && getSize(geometryExtent);
    if (geometryExtent && size)
      map.getView().fit(buffer(geometryExtent, Math.min(...size) * 0.2), {
        maxZoom: 16,
        duration: 800
      });
  }, [line, map]);

  return (
    <div style={{ marginLeft: 4, marginBottom: 8 }}>
      {!editable && prevTrackCenter !== trackCenter ? (
        <Row wrap={false} style={{ margin: 0 }}>
          <Col flex="auto">
            <Title
              underline
              level={3}
              ellipsis={{ expandable: false, tooltip: false, rows: 1 }}
              style={{ marginTop: 0, fontWeight: 'bold', marginBottom: 8, paddingBottom: 0 }}
            >
              {trackCenter}
            </Title>
          </Col>
          <Col flex="50px">
            <Checkbox
              checked={layerGroupVisible === true}
              indeterminate={layerGroupVisible === 'indeterminate'}
              style={{ transform: 'translateX(20px) translateY(8px) scale(2.0)' }}
              onChange={({ target: { checked } }) => toggleGroupLayerVisibility(trackCenter, checked)}
            />
          </Col>
        </Row>
      ) : null}
      <Card
        styles={{
          body: { padding: editable ? 12 : 0, paddingLeft: editable ? 4 : 0, paddingTop: editable ? 30 : 0 },
          root: { boxShadow: editable ? undefined : 'none' }
        }}
        variant={editable ? undefined : 'borderless'}
      >
        <Space
          wrap={false}
          vertical={!editable}
          size="small"
          style={{ position: 'absolute', right: 6, top: 6, zIndex: 1000 }}
        >
          {editable ? (
            <Switch
              checkedChildren={t('map.editableInMap')}
              unCheckedChildren={t('map.notEditableInMap')}
              onChange={checked =>
                setEditTrackIds(oldIds => {
                  if (checked) {
                    return [...oldIds, trackId];
                  } else {
                    return oldIds.filter(id => id !== trackId);
                  }
                })
              }
            />
          ) : null}
          {editable ? (
            <Button
              type="link"
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={!tracks?.length || field.name <= 0}
              onClick={() => moveUp(field.name)}
            />
          ) : null}
          {editable ? (
            <Button
              type="link"
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={!tracks?.length || field.name >= (tracks?.length ?? 0) - 1}
              onClick={() => moveDown(field.name)}
            />
          ) : null}
          {editable ? <Button type="link" size="small" icon={<CopyOutlined />} onClick={copyTrack} /> : null}
          {!editable ? (
            <Checkbox
              checked={layerVisible}
              style={{ transform: 'translateX(8px) scale(2.0)' }}
              onChange={() => toggleLayerVisibility(trackId)}
            />
          ) : null}
          <Button
            type={editable ? 'link' : 'default'}
            size={editable ? 'small' : 'middle'}
            icon={<SearchOutlined style={{ fontSize: editable ? 12 : 18 }} />}
            onClick={onZoomToTrack}
          />
          {editable ? (
            <Popconfirm
              title={t('common.Confirm')}
              okText={t('common.Yes')}
              cancelText={t('common.No')}
              onConfirm={() => remove(trackId, field.name)}
            >
              <Button type="link" size="small" icon={<CloseOutlined />} />
            </Popconfirm>
          ) : null}
        </Space>
        <Row wrap={false}>
          <Col flex={editable ? '100px' : '60px'}>
            <Flex vertical>
              {editable ? (
                <Button
                  style={{ height: 80, width: 80, padding: 0, margin: 0, marginTop: 25, alignSelf: 'center' }}
                  onClick={() => {
                    setEditingIndex(field.name);
                    setEditingSvg(svgString);
                    setSvgModalVisible(true);
                  }}
                >
                  {svgString && svgString.trim() !== '' ? (
                    <img
                      src={`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`}
                      alt={t('map.EditSvg')}
                      width="80"
                      height="80"
                      style={{ alignSelf: 'center', cursor: 'pointer' }}
                    />
                  ) : (
                    <StopOutlined style={{ alignSelf: 'center', cursor: 'pointer', fontSize: 56, padding: 6 }} />
                  )}
                </Button>
              ) : svgString && svgString.trim() !== '' ? (
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`}
                  alt={t('map.EditSvg')}
                  width="60"
                  height="60"
                  style={{ alignSelf: 'left' }}
                />
              ) : (
                <StopOutlined style={{ alignSelf: 'center', cursor: 'pointer', fontSize: 56, padding: 6 }} />
              )}
              {editable ? (
                <>
                  <Typography.Text
                    style={{ whiteSpace: 'nowrap', fontSize: 24, width: '100%', textAlign: 'center' }}
                  >{`${lineLengthKm}km`}</Typography.Text>
                  <Typography.Text
                    italic
                    style={{ whiteSpace: 'nowrap', fontSize: 12, width: '100%', textAlign: 'center' }}
                  >{`(${lineLength}m)`}</Typography.Text>
                </>
              ) : null}
            </Flex>
          </Col>
          <Col flex="auto" style={{ maxWidth: 'calc(100% - 140px)' }}>
            <FormItem name={[field.name, 'trackId']} style={{ display: 'none' }}>
              <Input type="hidden" />
            </FormItem>
            <FormItem name={[field.name, 'orderBy']} style={{ display: 'none' }}>
              <Input type="hidden" />
            </FormItem>
            <FormItem name={[field.name, 'line']} style={{ display: 'none' }}>
              <Input type="hidden" />
            </FormItem>
            <FormItem
              name={[field.name, 'name']}
              label={editable ? t('map.TrackName') : undefined}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, 'map.TrackName')
                }
              ]}
            >
              {editable ? (
                <Input />
              ) : (
                <ViewText type="header" endValue={`${lineLengthKm}km`} smallEndValue={`${lineLength}m`} />
              )}
            </FormItem>
            <FormItem
              name={[field.name, 'trackCenter']}
              style={{ display: editable ? 'block' : 'none' }}
              label={t('map.TrackCenter')}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, 'map.TrackCenter')
                }
              ]}
            >
              <Input />
            </FormItem>
            <FormItem name={[field.name, 'description']} label={editable ? t('map.Description') : undefined}>
              {editable ? <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} /> : <ViewText type="description" />}
            </FormItem>
            <FormItem
              name={[field.name, 'showByDefault']}
              label={t('map.showTrackByDefault')}
              valuePropName="checked"
              style={{ display: editable ? 'block' : 'none' }}
            >
              <Switch checkedChildren={t('map.showTrackByDefault')} unCheckedChildren={t('map.hideTrackByDefault')} />
            </FormItem>
            <FormItem name={[field.name, 'symbolSvg']} style={{ display: 'none' }}>
              <Input type="hidden" />
            </FormItem>
            {editable ? (
              <div style={{ marginTop: 8 }}>
                <Select
                  allowClear
                  value={null}
                  style={{ width: '100%' }}
                  placeholder={t('map.ChangeSvg')}
                  options={defaultTrackMarkings}
                  onChange={(value: string | undefined) => {
                    const marking = defaultTrackMarkings.find(m => m.value === value);
                    let svg = marking?.svg;
                    fillColors.forEach((color, i) => {
                      svg = getUpdatedSvgFillColor(svg, i, color);
                    });
                    if (svg) form.setFieldValue(['tracks', field.name, 'symbolSvg'], svg);
                  }}
                />
              </div>
            ) : null}
            {editable && fillColors.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {fillColors.map((color, i) => (
                  <div key={`color-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ColorPicker
                      showText
                      allowClear
                      value={color}
                      presets={presets}
                      onChange={(value: Parameters<NonNullable<ColorPickerProps['onChange']>>[0]) => {
                        const hex =
                          typeof value === 'string' ? value : (value?.toHexString?.() ?? value?.toHex?.() ?? undefined);
                        updateFillColor(i, hex);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default MapTrack;
