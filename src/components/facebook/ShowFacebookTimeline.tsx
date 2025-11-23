import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';

const IframeContainer = styled.div`
  width: 100%;
`;

const ShowFacebookTimeline = observer(() => {
  const { clubModel } = useMobxStore();
  const ref = React.useRef<HTMLDivElement>(null);
  const height = 400;
  const [width, setWidth] = useState(500);

  useEffect(() => {
    setWidth(!ref.current || !ref.current.clientWidth ? 300 : ref.current.clientWidth);
  }, [ref.current]);

  return clubModel.facebookUrl ? (
    <IframeContainer ref={ref} key="facebookContainer">
      <iframe
        key="facebookIframe"
        src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(
          clubModel.facebookUrl
        )}&tabs=timeline&width=${width}&height=${height}&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false&appId`}
        width="100%"
        height={height}
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
        frameBorder={0}
        allowTransparency={true}
        allow="encrypted-media"
      />
    </IframeContainer>
  ) : null;
});

export default ShowFacebookTimeline;
