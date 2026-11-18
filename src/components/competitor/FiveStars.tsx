import { Skeleton } from 'antd';
import { styled } from 'styled-components';
import { mobileMediaQuery } from '../../utils/useIsMobile';
import Star from '../svg/Star';

// On a phone two columns with smaller stars, instead of one long column
export const ContainerDiv = styled.div`
  padding-right: 20px;
  padding-bottom: 10px;
  width: 220px;
  float: left;
  ${mobileMediaQuery} {
    box-sizing: border-box;
    width: 50%;
    padding-right: 8px;
    padding-bottom: 8px;
  }
`;
export const LabelDiv = styled.div`
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
  ${mobileMediaQuery} {
    white-space: normal;
    line-height: 14px;
    min-height: 28px;
    display: flex;
    align-items: flex-end;
  }
`;
export const StarsDiv = styled.div`
  white-space: nowrap;
  height: 40px;
  ${mobileMediaQuery} {
    height: 30px;
    svg {
      width: 28px;
      height: 28px;
    }
  }
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
  ${mobileMediaQuery} {
    font-size: 24px;
    line-height: 30px;
  }
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

interface IFiveStarsProps {
  label?: string | null;
  stars: number;
  size?: number;
}
const FiveStars = ({ stars, label, size = 40 }: IFiveStarsProps) =>
  label ? (
    <ContainerDiv>
      <LabelDiv>{label}</LabelDiv>
      <StarsDiv>
        {stars === undefined ? (
          <Loader />
        ) : stars < 0 ? (
          <InfoDiv>-</InfoDiv>
        ) : (
          [1, 2, 3, 4, 5].map(star => <Star key={`star${star}`} filled={star <= stars} size={size} />)
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
        [1, 2, 3, 4, 5].map(star => <Star key={`star${star}`} filled={star <= stars} size={size} />)
      )}
    </OnlyStarsDiv>
  );
export default FiveStars;
