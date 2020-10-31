import React from 'react';
import { observer, inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { Zoom } from 'react-slideshow-image';
import styled from 'styled-components';
import 'react-slideshow-image/dist/styles.css';

const zoomOutProperties = {
  duration: 3000,
  transitionDuration: 500,
  infinite: true,
  indicators: true,
  scale: 0.4,
  arrows: false,
  pauseOnHover: true,
};

const SponsorContainer = styled.div`
  margin-bottom: 12px;
`;

const SponsorText = styled.div`
  font-size: 14px;
  font-weight: bolder;
  text-align: left;
  margin-bottom: 4px;
`;

const SponsorLink = styled.a`
  width: 100%;
  object-fit: contain;
  height: 100px;
`;

const SponsorImage = styled.img`
  width: 100%;
  object-fit: contain;
  height: 100px;
`;

const shuffle = (array) => {
  let a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const SponsorsSlideshow = inject('clubModel')(
  observer((props) => {
    const { clubModel } = props;
    const sponsors = clubModel.sponsors ? clubModel.sponsors.filter((s) => s.active) : undefined;
    const { t } = useTranslation();

    return sponsors && sponsors.length > 0 ? (
      <SponsorContainer className="slide-container">
        <SponsorText>{t('common.OurSponsors')}</SponsorText>
        <Zoom {...zoomOutProperties}>
          {shuffle(sponsors).map((sponsor, index) =>
            sponsor.url ? (
              <SponsorLink href={sponsor.url} target="_blank">
                <SponsorImage key={`sponsor#${index}`} src={sponsor.logo.url} />
              </SponsorLink>
            ) : (
              <SponsorImage key={`sponsor#${index}`} src={sponsor.logo.url} />
            )
          )}
        </Zoom>
      </SponsorContainer>
    ) : null;
  })
);

export default SponsorsSlideshow;
