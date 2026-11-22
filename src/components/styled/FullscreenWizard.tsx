import { Space, Typography } from 'antd';
import { ReactNode, useEffect, useRef } from 'react';
import { styled } from 'styled-components';
import { useSize } from '../../utils/useSize';

const Title = Typography.Title;

// The window below the header, a height given to the wizard replaces it (style).
// dvh is the visible height on a phone (vh includes the area behind the browser bars and pushed the buttons out
// of sight), vh is the fallback for an older browser.
const FullScreenContainer = styled.div`
  height: calc(100vh - 92px);
  height: calc(100dvh - 92px);
  width: 100%;
  overflow: hidden;
`;

const TitleContainer = styled.div`
  height: 52px;
  width: 100%;
  overflow: hidden;
`;

interface IContentContainerProps {
  $reduceHeight: number;
}
const ContentContainer = styled.div<IContentContainerProps>`
  height: calc(100% - ${({ $reduceHeight }) => $reduceHeight}px);
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
`;

const StepsContainer = styled.div`
  width: 100%;
  padding-bottom: 8px;
`;

const FooterContainer = styled.div`
  margin-top: 8px;
  width: 100%;
  overflow: hidden;
`;

interface IFullScreenModalProps {
  title: ReactNode;
  /** The steps of the wizard, they stay at the top, only the content below them scrolls */
  steps?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  height?: string;
  onContentOffsetHeight?: (height: number) => void;
}

const FullScreenWizard = ({ title, steps, footer, children, height, onContentOffsetHeight }: IFullScreenModalProps) => {
  const footerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const { height: footerHeight } = useSize(footerRef, false, true, 'client');
  const { height: stepsHeight } = useSize(stepsRef, false, true, 'offset');
  const { height: contentHeight } = useSize(contentRef, false, true, 'offset');

  useEffect(() => {
    if (onContentOffsetHeight && contentHeight != null) onContentOffsetHeight(contentHeight);
  }, [contentHeight, onContentOffsetHeight]);

  return (
    <FullScreenContainer style={height ? { height } : undefined}>
      <TitleContainer>
        <Title level={2} ellipsis={{ expandable: false, tooltip: false, rows: 1 }} style={{ margin: 0 }}>
          {title}
        </Title>
      </TitleContainer>
      {steps ? <StepsContainer ref={stepsRef}>{steps}</StepsContainer> : null}
      <ContentContainer
        ref={contentRef}
        $reduceHeight={52 + (steps ? (stepsHeight ?? 32) : 0) + Math.max(32, footerHeight ?? 32) + 16}
      >
        {children}
      </ContentContainer>
      <FooterContainer ref={footerRef}>
        <Space wrap style={{ float: 'right' }}>
          {footer}
        </Space>
      </FooterContainer>
    </FullScreenContainer>
  );
};

export default FullScreenWizard;
