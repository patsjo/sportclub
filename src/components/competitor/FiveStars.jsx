import React from 'react';
import Star from '../svg/Star';
import styled from 'styled-components';
import { Skeleton } from 'antd';

export const ContainerDiv = styled.div`
  padding-right: 20px;
  padding-bottom: 10px;
  width: 220px;
  float: left;
`;
export const LabelDiv = styled.div`
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
`;
export const StarsDiv = styled.div`
  white-space: nowrap;
  height: 40px;
`;
export const OnlyStarsDiv = styled.div`
  white-space: nowrap;
`;
export const InfoDiv = styled.div`
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 32px;
  font-weight: 600;
  line-height: 34px;
`;

const SkeletonsDiv = styled.div`
  white-space: nowrap;
  height: 40px;
  padding-top: 12px;
`;

export const Loader = () => (
  <SkeletonsDiv>
    <Skeleton.Button active shape="round" />
  </SkeletonsDiv>
);

const FiveStars = ({ label, stars, size = 40 }) =>
  label ? (
    <ContainerDiv>
      <LabelDiv>{label}</LabelDiv>
      <StarsDiv>
        {stars === undefined ? (
          <Loader />
        ) : stars < 0 ? (
          <InfoDiv>-</InfoDiv>
        ) : (
          [1, 2, 3, 4, 5].map((star) => <Star key={`star${star}`} filled={star <= stars} size={size} />)
        )}
      </StarsDiv>
    </ContainerDiv>
  ) : (
    <OnlyStarsDiv>
      {stars === undefined ? (
        <Loader />
      ) : stars < 0 ? (
        '-'
      ) : (
        [1, 2, 3, 4, 5].map((star) => <Star key={`star${star}`} filled={star <= stars} size={size} />)
      )}
    </OnlyStarsDiv>
  );
export default FiveStars;
