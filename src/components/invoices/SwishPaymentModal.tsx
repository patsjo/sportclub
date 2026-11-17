import { CheckCircleTwoTone } from '@ant-design/icons';
import { Alert, Button, Modal, Space, Spin, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IInvoice, ISwishStartResponse, ISwishStatusResponse, SwishPaymentStatus } from '../../models/invoiceModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { errorText, formatMoney } from './invoiceHelper';

/** Swish cancels a payment request after 3 minutes */
const pollIntervalMs = 2500;
const maxWaitMs = 200 * 1000;

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

interface ISwishPaymentModalProps {
  invoice: IInvoice;
  invoicesUrl: string;
  onClose: (paid: boolean) => void;
}

const SwishPaymentModal = observer(({ invoice, invoicesUrl, onClose }: ISwishPaymentModalProps) => {
  const { t } = useTranslation();
  const { sessionModel } = useMobxStore();
  const [payment, setPayment] = useState<ISwishStartResponse>();
  const [status, setStatus] = useState<SwishPaymentStatus>();
  const [error, setError] = useState<string>();
  const [checkError, setCheckError] = useState<string>();
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closed = useRef(false);

  const cancelPayment = useCallback(
    (paymentId: string) =>
      PostJsonData<ISwishStatusResponse>(
        invoicesUrl,
        { iType: 'SWISH_CANCEL', paymentId },
        true,
        sessionModel.authorizationHeader,
        1
      ).catch(() => undefined),
    [invoicesUrl, sessionModel.authorizationHeader]
  );

  const poll = useCallback(
    (paymentId: string) => {
      timer.current = setTimeout(() => {
        if (closed.current) return;
        PostJsonData<ISwishStatusResponse>(
          invoicesUrl,
          { iType: 'SWISH_STATUS', paymentId },
          true,
          sessionModel.authorizationHeader,
          1
        )
          .then(response => {
            if (closed.current || !response) return;
            setCheckError(undefined);
            setStatus(response.status);
            if (response.status === 'CREATED') {
              if (Date.now() - startedAt.current > maxWaitMs) {
                setTimedOut(true);
                cancelPayment(paymentId);
              } else poll(paymentId);
            } else if (response.status !== 'PAID') {
              setError(
                response.status === 'DECLINED'
                  ? t('invoices.SwishDeclined')
                  : response.status === 'CANCELLED'
                    ? t('invoices.SwishCancelled')
                    : t('invoices.SwishError', {
                        error: [response.errorCode, response.errorMessage].filter(e => !!e).join(' '),
                        interpolation: { escapeValue: false }
                      })
              );
            }
          })
          .catch(e => {
            if (closed.current) return;
            setCheckError(errorText(e));
            poll(paymentId);
          });
      }, pollIntervalMs);
    },
    [cancelPayment, invoicesUrl, sessionModel.authorizationHeader, t]
  );

  useEffect(() => {
    closed.current = false;
    PostJsonData<ISwishStartResponse>(
      invoicesUrl,
      { iType: 'SWISH_START', invoiceId: invoice.invoiceId },
      true,
      sessionModel.authorizationHeader,
      1
    )
      .then(response => {
        if (!response) return;
        if (closed.current) {
          cancelPayment(response.paymentId);
          return;
        }
        startedAt.current = Date.now();
        setPayment(response);
        setStatus('CREATED');
        // On the mobile the Swish app is opened directly
        if (isMobile() && response.token) window.location.href = swishAppUrl(response.token);
        poll(response.paymentId);
      })
      .catch(e => setError(t('invoices.SwishError', { error: errorText(e), interpolation: { escapeValue: false } })));

    return () => {
      closed.current = true;
      clearTimeout(timer.current);
    };
    // Started once when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCancel = useCallback(() => {
    closed.current = true;
    clearTimeout(timer.current);
    if (payment && status === 'CREATED') cancelPayment(payment.paymentId);
    onClose(status === 'PAID');
  }, [cancelPayment, onClose, payment, status]);

  const paid = status === 'PAID';

  return (
    <Modal
      open
      destroyOnHidden
      title={`${t('invoices.PayWithSwish')} – ${invoice.title}`}
      footer={
        <Button type={paid ? 'primary' : 'default'} onClick={onCancel}>
          {paid || error || timedOut ? t('common.Close') : t('invoices.SwishCancel')}
        </Button>
      }
      onCancel={onCancel}
    >
      <Space vertical style={{ width: '100%', textAlign: 'center' }} size="middle">
        <Typography.Text strong>
          {invoice.message} · {invoice.paidAmount > 0 ? `${t('invoices.Left')} ` : ''}
          {formatMoney(payment?.amount ?? invoice.total - invoice.paidAmount)}
        </Typography.Text>
        {error ? <Alert showIcon type="error" title={error} /> : null}
        {timedOut ? <Alert showIcon type="warning" title={t('invoices.SwishTimeout')} /> : null}
        {paid ? (
          <Alert
            showIcon
            type="success"
            icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
            title={t('invoices.SwishPaid', { amount: formatMoney(payment?.amount ?? invoice.total) })}
          />
        ) : null}
        {!payment && !error ? <Spin size="large" /> : null}
        {payment && status === 'CREATED' && !timedOut ? (
          <>
            {payment.qrCode ? (
              <img src={payment.qrCode} alt="Swish QR" style={{ width: 240, height: 240, margin: '0 auto' }} />
            ) : (
              <Alert showIcon type="info" title={t('invoices.SwishNoQr')} />
            )}
            <Typography.Text type="secondary">{t('invoices.SwishScanQr')}</Typography.Text>
            {payment.token ? (
              <Button type="primary" size="large" href={swishAppUrl(payment.token)}>
                {t('invoices.SwishOpenApp')}
              </Button>
            ) : null}
            <Space>
              <Spin size="small" />
              <Typography.Text>{t('invoices.SwishWaiting')}</Typography.Text>
            </Space>
            {checkError ? (
              <Typography.Text type="warning">
                {t('invoices.SwishCheckFailed', { error: checkError, interpolation: { escapeValue: false } })}
              </Typography.Text>
            ) : null}
          </>
        ) : null}
      </Space>
    </Modal>
  );
});

/** Opens the Swish app, that returns to this page when the payment is done */
const swishAppUrl = (token: string) =>
  `swish://paymentrequest?token=${encodeURIComponent(token)}&callbackurl=${encodeURIComponent(window.location.href)}`;

export default SwishPaymentModal;
