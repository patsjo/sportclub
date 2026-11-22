import { QrcodeOutlined, SwapOutlined } from '@ant-design/icons';
import { Button, QRCode, Tooltip } from 'antd';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { keyframes, styled } from 'styled-components';
import bankgiroIcon from '../../images/payment/bankgiro.png';
import ibanIcon from '../../images/payment/iban.png';
import plusgirotIcon from '../../images/payment/plusgirot.svg';
import swishIcon from '../../images/payment/swish.svg';
import { IPaymentQr, PaymentQrType } from './paymentQr';

// The logos in the middle of the QR code
const qrIcons: Record<PaymentQrType, string> = {
  Bankgiro: bankgiroIcon,
  PlusGirot: plusgirotIcon,
  IBAN: ibanIcon,
  Swish: swishIcon
};

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Once after a moment, a short turn that shows there is a back side
const peek = keyframes`
  0%, 100% { transform: rotateY(0deg); }
  50% { transform: rotateY(28deg); }
`;

// From the small QR code in the table to the big one in the middle of the screen, and back
const zoomIn = keyframes`
  from { transform: translate(var(--dx), var(--dy)) scale(var(--s)); }
  to { transform: none; }
`;
const zoomOut = keyframes`
  from { transform: none; }
  to { transform: translate(var(--dx), var(--dy)) scale(var(--s)); }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const zoomDuration = 0.35;

const Holder = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const Scene = styled.div<{ $size: number; $stacked: boolean }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  perspective: ${({ $size }) => $size * 5}px;
  /* The edge of the other card behind, it is two cards */
  ${({ $stacked, $size }) =>
    $stacked
      ? `&::before {
          content: '';
          position: absolute;
          inset: 0;
          transform: translate(${Math.max(4, Math.round($size / 28))}px, ${Math.max(4, Math.round($size / 28))}px);
          border-radius: 6px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }`
      : ''}
`;

const Card = styled.div<{ $flipped: boolean; $peek: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
  transform: rotateY(${({ $flipped }) => ($flipped ? 180 : 0)}deg);
  animation: ${({ $peek }) => ($peek ? peek : 'none')} 0.9s ease-in-out 1.2s 1;
  cursor: zoom-in;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

const Face = styled.div<{ $back?: boolean }>`
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  line-height: 0;
  transform: ${({ $back }) => ($back ? 'rotateY(180deg)' : 'none')};
`;

const Backdrop = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.55);
  animation: ${({ $closing }) => ($closing ? fadeOut : fadeIn)} ${zoomDuration}s ease forwards;
`;

const ZoomBox = styled.div<{ $closing: boolean }>`
  position: fixed;
  z-index: 1101;
  transform-origin: top left;
  animation: ${({ $closing }) => ($closing ? zoomOut : zoomIn)} ${zoomDuration}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;

  ${Card} {
    cursor: zoom-out;
  }
`;

const ZoomCaption = styled.div<{ $closing: boolean }>`
  position: fixed;
  z-index: 1101;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #fff;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  padding: 0 16px;
  animation: ${({ $closing }) => ($closing ? fadeOut : fadeIn)} ${zoomDuration}s ease forwards;
`;

interface IFlipCardProps {
  front: IPaymentQr;
  back?: IPaymentQr;
  size: number;
  flipped: boolean;
  peek?: boolean;
  onClick: () => void;
}

/** One or two QR codes on the front and back of a card that is flipped */
const FlipCard = ({ front, back, size, flipped, peek = false, onClick }: IFlipCardProps) => {
  const face = (qr: IPaymentQr, isBack: boolean) => (
    <Face $back={isBack} aria-hidden={isBack === flipped ? undefined : true}>
      <QRCode
        bordered={false}
        errorLevel="M"
        icon={qrIcons[qr.type]}
        iconSize={Math.round(size * 0.24)}
        size={size}
        style={{ padding: Math.max(4, Math.round(size / 28)) }}
        type="svg"
        value={qr.value}
      />
    </Face>
  );
  return (
    <Scene $size={size} $stacked={!!back}>
      <Card $flipped={flipped} $peek={peek} onClick={onClick}>
        {face(front, false)}
        {back ? face(back, true) : null}
      </Card>
    </Scene>
  );
};

interface IZoom {
  /** Where the small QR code is, the big one grows from there */
  from: DOMRect;
  closing: boolean;
}

interface IPaymentQrCodeProps {
  qrs: IPaymentQr[];
  size?: number;
  /** Only a button that shows the big QR code, when it is an alternative to the Swish payment on the web page */
  collapsed?: boolean;
}

/**
 * The QR code to pay the invoice with. When both the bank account and Swish exist, the bank account is in front and the
 * card is flipped to show Swish. A click makes it big in the middle of the screen, and a click on the big one makes it
 * small again. Collapsed, only a button that makes it big.
 */
const PaymentQrCode = ({ qrs, size = 112, collapsed = false }: IPaymentQrCodeProps) => {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  const [zoom, setZoom] = useState<IZoom>();
  const smallRef = useRef<HTMLDivElement>(null);
  const [front, back] = qrs;

  const close = () => {
    if (reducedMotion()) setZoom(undefined);
    else setZoom(z => (z ? { ...z, closing: true } : z));
  };

  useEffect(() => {
    if (!zoom || zoom.closing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  if (!front) return null;
  const current = flipped && back ? back : front;
  const other = flipped ? front : back;
  const flip = () => setFlipped(f => !f);

  const open = () => {
    const from = smallRef.current?.getBoundingClientRect();
    if (from) setZoom({ from, closing: false });
  };

  const flipButton = (light: boolean) =>
    other ? (
      <Tooltip title={t('invoices.QrShow', { type: other.type })}>
        <Button
          icon={<SwapOutlined />}
          size={light ? 'middle' : 'small'}
          style={light ? undefined : { paddingInline: 0 }}
          type={light ? 'default' : 'link'}
          onClick={flip}
        >
          {current.type}
        </Button>
      </Tooltip>
    ) : (
      <span style={{ fontSize: light ? 14 : 12, opacity: light ? 1 : 0.65 }}>{current.type}</span>
    );

  // The big QR code fits the screen, centered a bit above the middle to give room for the text below
  const zoomed = () => {
    if (!zoom) return null;
    const big = Math.min(360, window.innerWidth - 48, window.innerHeight - 180);
    const left = (window.innerWidth - big) / 2;
    const top = Math.max(16, (window.innerHeight - big) / 2 - 40);
    const vars = {
      left,
      top,
      '--dx': `${zoom.from.left - left}px`,
      '--dy': `${zoom.from.top - top}px`,
      '--s': Math.min(zoom.from.width, zoom.from.height * 2) / big
    } as CSSProperties;
    return createPortal(
      <>
        <Backdrop $closing={zoom.closing} onClick={close} />
        <ZoomBox
          $closing={zoom.closing}
          style={vars}
          onAnimationEnd={e => e.target === e.currentTarget && zoom.closing && setZoom(undefined)}
        >
          <FlipCard back={back} flipped={flipped} front={front} size={big} onClick={close} />
        </ZoomBox>
        <ZoomCaption $closing={zoom.closing} style={{ top: top + big + 20 }}>
          {flipButton(true)}
          <span>
            {current.type === 'Swish' ? t('invoices.QrScanSwish') : t('invoices.QrScanBank', { type: current.type })}
          </span>
        </ZoomCaption>
      </>,
      document.body
    );
  };

  if (collapsed) {
    return (
      <span ref={smallRef}>
        <Tooltip title={zoom ? undefined : t('invoices.QrCollapsedTooltip', { type: front.type })}>
          <Button icon={<QrcodeOutlined />} onClick={open}>
            {t('invoices.QrCollapsed')}
          </Button>
        </Tooltip>
        {zoomed()}
      </span>
    );
  }

  return (
    <Holder>
      <Tooltip title={zoom ? undefined : t('invoices.QrZoom')}>
        <div ref={smallRef} style={{ visibility: zoom ? 'hidden' : undefined }}>
          <FlipCard back={back} flipped={flipped} front={front} peek={!!back} size={size} onClick={open} />
        </div>
      </Tooltip>
      {flipButton(false)}
      {zoomed()}
    </Holder>
  );
};

export default PaymentQrCode;
