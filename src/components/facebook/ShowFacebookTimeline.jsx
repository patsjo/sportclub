import React, { useState, useEffect } from 'react';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';

const IframeContainer = styled.div`
  width: 100%;
`;

const ShowFacebookTimeline = inject('clubModel')(
  observer(({ clubModel }) => {
    const ref = React.createRef();
    const height = 400;
    const [width, setWidth] = useState(500);

    useEffect(() => {
      setWidth(!ref.current || !ref.current.clientWidth ? 300 : ref.current.clientWidth);
    }, [ref.current]);

    return (
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
          frameborder="0"
          allowTransparency="true"
          allow="encrypted-media"
        />
      </IframeContainer>
    );
  })
);

export default ShowFacebookTimeline;
