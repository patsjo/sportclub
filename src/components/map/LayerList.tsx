import { Tree } from 'antd';
import { DataNode } from 'antd/lib/tree';
import { observer } from 'mobx-react';
import { Collection, Map } from 'ol';
import { Control } from 'ol/control';
import BaseLayer from 'ol/layer/Base';
import GroupLayer from 'ol/layer/Group';
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
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
  display: ${(props) => (props.visible ? 'block' : 'none')};

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

interface IDataNodeMap extends DataNode {
  visible: boolean;
  zoomExtent: number[];
}

const getTreeData = (map: Map, mapLayers?: Collection<BaseLayer>): IDataNodeMap[] => {
  const nodes: IDataNodeMap[] = [];

  mapLayers?.forEach((mapLayer) => {
    let layerProps = mapLayer.getProperties();
    layerProps = {
      type: layerProps.type,
      id: layerProps.id,
      title: layerProps.title,
      zoomExtent: layerProps.zoomExtent,
    };
    if (layerProps.type === 'group') {
      nodes.push({
        key: layerProps.id,
        title: <LayerListItem title={layerProps.title ?? 'Unknown'} map={map} zoomExtent={layerProps.zoomExtent} />,
        checkable: true,
        children: getTreeData(map, (mapLayer as GroupLayer).getLayers()),
        visible: mapLayer.getVisible(),
        zoomExtent: layerProps.zoomExtent,
      });
    } else if (layerProps.type === 'base-tile') {
      nodes.push({
        key: layerProps.id,
        title: <LayerListItem title={layerProps.title ?? 'Unknown'} map={map} zoomExtent={layerProps.zoomExtent} />,
        checkable: true,
        isLeaf: true,
        visible: mapLayer.getVisible(),
        zoomExtent: layerProps.zoomExtent,
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
  const [mapLayers, setMapLayers] = useState<Collection<BaseLayer>>();
  const treeData = useMemo(() => (map ? getTreeData(map, mapLayers) : []), [map, mapLayers]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const layerListRef = useRef<HTMLDivElement>(null);

  const onCheck = (
    checkedKeys:
      | {
          checked: React.Key[];
          halfChecked: React.Key[];
        }
      | React.Key[],
  ) => {
    const keys = checkedKeys as React.Key[];
    const allMapLayers = map?.getAllLayers()?.filter((l) => l.getProperties().id) ?? [];

    allMapLayers.forEach((l) => l.setVisible(keys.includes(l.getProperties().id)));
    setCheckedKeys(keys);
  };

  useEffect(() => {
    if (map && layerListRef.current && !mapLayers) {
      setMapLayers(map.getLayers());
      setCheckedKeys(
        map
          .getAllLayers()
          .filter((l) => l.getProperties().id && l.getVisible())
          .map((l) => l.getProperties().id) ?? [],
      );
      const layerListTreeControl = new Control({
        element: layerListRef.current,
      });
      map.addControl(layerListTreeControl);
    }
  }, [map, mapLayers, layerListRef.current]);

  return (
    <StyledControl visible={visible} ref={layerListRef}>
      <Tree checkable selectable={false} treeData={treeData} onCheck={onCheck} checkedKeys={checkedKeys} />
    </StyledControl>
  );
});

export default LayerList;
