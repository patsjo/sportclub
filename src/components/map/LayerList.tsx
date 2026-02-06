import { Tree, TreeProps } from 'antd';
import { observer } from 'mobx-react';
import { Map } from 'ol';
import { CollectionEvent } from 'ol/Collection';
import { Control } from 'ol/control';
import { EventsKey } from 'ol/events';
import BaseLayer from 'ol/layer/Base';
import GroupLayer from 'ol/layer/Group';
import { unByKey } from 'ol/Observable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styled } from 'styled-components';
import LayerListItem from './LayerListItem';

interface IStyledControlProps {
  visible: boolean;
}

const StyledControl = styled.div<IStyledControlProps>`
  background-color: rgba(0, 60, 136, 0.75);
  border-color: rgba(255, 255, 255, 0.8);
  border-style: solid;
  border-width: 3px;
  border-radius: 4px;
  color: white;
  padding: 6px;
  position: absolute;
  right: 2.5em;
  top: 4.5em;
  display: ${props => (props.visible ? 'block' : 'none')};

  &&& .ant-tree {
    background-color: rgba(255, 255, 255, 0);
    color: white;
    font-size: 9pt;
  }
  &&& .ant-tree-checkbox-checked .ant-tree-checkbox-inner {
    background-color: rgba(255, 190, 32, 0.6);
    border-color: rgba(255, 190, 32, 0.6);
  }
`;

type IDataNodeMap = NonNullable<TreeProps['treeData']>[number] & {
  visible: boolean;
  zoomExtent: number[];
};

const getTreeData = (map: Map, mapLayers?: BaseLayer[]): IDataNodeMap[] => {
  const nodes: IDataNodeMap[] = [];

  mapLayers?.forEach(mapLayer => {
    let layerProps = mapLayer.getProperties();
    layerProps = {
      type: layerProps.type,
      id: layerProps.id,
      title: layerProps.title,
      zoomExtent: layerProps.zoomExtent
    };
    if (layerProps.type === 'group' || layerProps.type === 'track-group') {
      nodes.push({
        key: layerProps.id,
        title: <LayerListItem title={layerProps.title ?? 'Unknown'} map={map} zoomExtent={layerProps.zoomExtent} />,
        checkable: true,
        children: getTreeData(map, (mapLayer as GroupLayer).getLayers().getArray()),
        visible: mapLayer.getVisible(),
        zoomExtent: layerProps.zoomExtent
      });
    } else if (layerProps.type === 'base-tile' || layerProps.type === 'track') {
      nodes.push({
        key: layerProps.id,
        title: <LayerListItem title={layerProps.title ?? 'Unknown'} map={map} zoomExtent={layerProps.zoomExtent} />,
        checkable: true,
        isLeaf: true,
        visible: mapLayer.getVisible(),
        zoomExtent: layerProps.zoomExtent
      });
    }
  });
  return nodes;
};

interface ILayerListProps {
  map?: Map;
  visible: boolean;
}

const LayerList = observer(({ map, visible }: ILayerListProps) => {
  const [mapLayers, setMapLayers] = useState<BaseLayer[]>();
  const treeData = useMemo(() => (map ? getTreeData(map, mapLayers) : []), [map, mapLayers]);
  const [allIds, setAllIds] = useState<React.Key[]>([]);
  const [checkedIds, setCheckedIds] = useState<React.Key[]>([]);
  const layerListRef = useRef<HTMLDivElement | null>(null);
  const [layerListEl, setLayerListEl] = useState<HTMLDivElement | null>(null);
  const setLayerListRef = useCallback((el: HTMLDivElement | null) => {
    layerListRef.current = el;
    setLayerListEl(el);
  }, []);

  const onCheck = (
    checked:
      | {
          checked: React.Key[];
          halfChecked: React.Key[];
        }
      | React.Key[]
  ) => {
    const keys = checked as React.Key[];
    const allMapLayers = map?.getAllLayers()?.filter(l => l.getProperties().id) ?? [];

    allMapLayers.forEach(l => l.setVisible(keys.includes(l.getProperties().id)));
    setCheckedIds(keys);
  };

  const onLayerAdd = useCallback(
    (evt: CollectionEvent<BaseLayer>) => {
      if (map) {
        setMapLayers([...map.getLayers().getArray()]);
        setCheckedIds(
          map
            .getAllLayers()
            .filter(l => l.getProperties().id && l.getVisible())
            .map(l => l.getProperties().id) ?? []
        );
        setAllIds(
          map
            .getAllLayers()
            .filter(l => l.getProperties().id)
            .map(l => l.getProperties().id) ?? []
        );
        const layer = evt.element;
        if ((layer as GroupLayer).getLayers) (layer as GroupLayer).getLayers().on('add', onLayerAdd);
      }
    },
    [map]
  );

  useEffect(() => {
    if (!map) return;
    const onAddKey = map.getLayers().on('add', onLayerAdd);

    return () => {
      unByKey([onAddKey]);
    };
  }, [map, onLayerAdd]);

  useEffect(() => {
    if (!map) return;
    const keys: EventsKey[] = [];
    const allMapLayers = map.getAllLayers()?.filter(l => l.getProperties().id?.startsWith('track-')) ?? [];
    allIds.forEach(id => {
      const layer = allMapLayers.find(l => l.getProperties().id === id);
      if (!layer) return;
      const key = layer.on('change:visible', () =>
        setCheckedIds(old => (layer.getVisible() ? [...old, id] : old.filter(oldId => oldId !== id)))
      );
      keys.push(key);
    });
    return () => {
      unByKey(keys);
    };
  }, [map, allIds]);

  useEffect(() => {
    if (map && layerListEl) {
      const layerListTreeControl = new Control({
        element: layerListEl
      });
      map.addControl(layerListTreeControl);
      return () => {
        map.removeControl(layerListTreeControl);
      };
    }
  }, [map, layerListEl]);

  return (
    <StyledControl ref={setLayerListRef} visible={visible}>
      <Tree checkable selectable={false} treeData={treeData} checkedKeys={checkedIds} onCheck={onCheck} />
    </StyledControl>
  );
});

export default LayerList;
