import { SearchOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { Map } from 'ol';
import { buffer, getSize } from 'ol/extent';
import React from 'react';
import styled from 'styled-components';

const StyledButton = styled(Button)`
  color: rgba(255, 190, 32, 0.8);
  font-size: 20px;
  line-height: 16px;
  padding: 0 6px;
  margin-top: -6px;

  &&& :hover {
    color: rgba(255, 224, 64, 0.8);
  }
  &&& :focus {
    color: rgba(255, 224, 64, 0.8);
  }
  &&& :active {
    color: rgba(255, 224, 64, 0.8);
  }
`;

interface ILayerListProps {
  map: Map;
  title: string;
  zoomExtent: number[];
}

const LayerListItem = observer(({ map, title, zoomExtent }: ILayerListProps) => {
  const onZoom = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const size = zoomExtent && getSize(zoomExtent);
    map.getView().fit(buffer(zoomExtent, Math.min(...size) * 0.2), {
      duration: 800,
    });
  };

  return (
    <span>
      {title}
      <StyledButton type="link" onClick={onZoom}>
        <SearchOutlined />
      </StyledButton>
    </span>
  );
});

export default LayerListItem;
