import React from 'react';
import styled from 'styled-components';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';

const StyledDiv = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const StyledOuterDiv = styled.div`
  position: absolute;
  width: 160px;
  height: 100px;
  left: calc(50% - 80px);
  top: calc(50% - 50px);
  border-radius: 16px;
  opacity: 0.8;
  z-index: 100;
  animation: fade 1s ease-in-out forwards;
  pointer-events: ${(props) => (props.loaded ? 'none' : 'auto')};
  animation-play-state: ${(props) => (props.loaded ? 'running' : 'paused')};
  background-color: white;
  @keyframes fade {
    from {
      opacity: 0.8;
    }
    to {
      opacity: 0;
    }
  }
`;

const Loader = ({ view }) => {
  const [loaded, setLoaded] = React.useState(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    let handle = null;
    if (view) {
      handle = view.watch('updating', () => {
        if (view.map && view.map.basemap.loaded && !loaded) {
          setLoaded(true);
        }
      });
    }
    return () => handle && handle.remove();
  }, [loaded, view]);

  return (
    <StyledOuterDiv loaded={loaded}>
      <StyledDiv>
        <Spin tip={`${t('map.Loading')} ${t('map.Map').toLowerCase()}`} size="large" />
      </StyledDiv>
    </StyledOuterDiv>
  );
};

export default Loader;
