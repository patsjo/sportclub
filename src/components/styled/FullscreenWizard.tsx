import { Space, Typography } from 'antd';
import { ReactNode, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useSize } from '../../utils/useSize';

const Title = Typography.Title;

const FullScreenContainer = styled.div`
  height: calc(100vh - 92px);
  width: 100%;
  overflow: hidden;
`;

const TitleContainer = styled.div`
  height: 52px;
  width: 100%;
  overflow: hidden;
`;

interface IContentContainerProps {
  reduceHeight: number;
}
const ContentContainer = styled.div<IContentContainerProps>`
  height: calc(100% - ${({ reduceHeight }) => reduceHeight}px);
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
`;

const FooterContainer = styled.div`
  margin-top: 8px;
  width: 100%;
  overflow: hidden;
`;

interface IFullScreenModalProps {
  title: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  onContentOffsetHeight?: (height: number) => void;
}

const FullScreenWizard = ({ title, footer, children, onContentOffsetHeight }: IFullScreenModalProps) => {
  const footerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { height: footerHeight } = useSize(footerRef, ['height'], 'client');
  const { height: contentHeight } = useSize(contentRef, ['height'], 'offset');

  useEffect(() => {
    onContentOffsetHeight && contentHeight != null && onContentOffsetHeight(contentHeight);
  }, [contentHeight]);

  return (
    <FullScreenContainer>
      <TitleContainer>
        <Title level={2} ellipsis={{ expandable: false, tooltip: false, rows: 1 }} style={{ margin: 0 }}>
          {title}
        </Title>
      </TitleContainer>
      <ContentContainer ref={contentRef} reduceHeight={52 + Math.max(32, footerHeight ?? 32) + 16}>
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
