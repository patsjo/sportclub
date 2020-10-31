import React from 'react';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';
import Columns from '../dashboard/Columns';

const SponsorLink = styled.a`
  width: 100%;
  object-fit: contain;
  height: 108px;
`;

const SponsorImage = styled.img`
  width: 100%;
  object-fit: contain;
  height: 108px;
  padding-bottom: 12px;
`;

const AllSponsors = inject('clubModel')(
  observer((props) => {
    const { clubModel } = props;
    const sponsors = clubModel.sponsors ? clubModel.sponsors.filter((s) => s.active) : undefined;

    return sponsors && sponsors.length > 0 ? (
      <Columns>
        {sponsors
          .sort((a, b) =>
            a.name.toLowerCase() > b.name.toLowerCase() ? 1 : b.name.toLowerCase() > a.name.toLowerCase() ? -1 : 0
          )
          .map((sponsor, index) =>
            sponsor.url ? (
              <SponsorLink href={sponsor.url} target="_blank">
                <SponsorImage key={`sponsor#${index}`} src={sponsor.logo.url} />
              </SponsorLink>
            ) : (
              <SponsorImage key={`sponsor#${index}`} src={sponsor.logo.url} />
            )
          )}
      </Columns>
    ) : null;
  })
);

export default AllSponsors;
