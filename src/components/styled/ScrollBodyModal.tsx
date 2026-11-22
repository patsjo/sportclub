import { Modal } from 'antd';
import { styled } from 'styled-components';
import { mobileMediaQuery } from '../../utils/useIsMobile';

/**
 * A dialog that fits the screen: the title and the buttons stay, only the body scrolls (whatever the title height).
 * For style={{ top: 40 }}, on a phone index.css puts every dialog 8px from the top.
 * dvh is the visible height on a phone (vh includes the area behind the browser bars), vh is the fallback.
 */
export const ScrollBodyModal = styled(Modal)`
  &&& .ant-modal-container {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 80px);
    max-height: calc(100dvh - 80px);
  }
  &&& .ant-modal-header,
  &&& .ant-modal-footer {
    flex: none;
  }
  &&& .ant-modal-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
  }
  ${mobileMediaQuery} {
    &&& .ant-modal-container {
      max-height: calc(100vh - 32px);
      max-height: calc(100dvh - 32px);
    }
  }
`;
