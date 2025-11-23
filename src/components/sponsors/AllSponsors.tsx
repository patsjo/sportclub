import { observer } from 'mobx-react';
import { ISponsorProps } from '../../models/mobxClubModel';
import React from 'react';
import styled from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import Columns from '../dashboard/columns/Columns';

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

const AllSponsors = observer(() => {
  const { clubModel } = useMobxStore();
  const sponsors = React.useMemo<ISponsorProps[] | undefined>(
    () => (clubModel.sponsors ? clubModel.sponsors.filter((s) => s.active) : undefined),
    [clubModel.sponsors]
  );

  return sponsors && sponsors.length > 0 ? (
    <Columns key="columns#allSponsors">
      {sponsors
        .sort((a, b) =>
          a.name.toLowerCase() > b.name.toLowerCase() ? 1 : b.name.toLowerCase() > a.name.toLowerCase() ? -1 : 0
        )
        .map((sponsor, index) =>
          sponsor.url ? (
            <SponsorLink key={`sponsor#${index}`} href={sponsor.url} target="_blank">
              <SponsorImage src={sponsor.logo.url} />
            </SponsorLink>
          ) : (
            <SponsorImage key={`sponsor#${index}`} src={sponsor.logo.url} />
          )
        )}
    </Columns>
  ) : null;
});

export default AllSponsors;
