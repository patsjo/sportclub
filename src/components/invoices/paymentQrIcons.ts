import bankgiroIcon from '../../images/payment/bankgiro.png';
import ibanIcon from '../../images/payment/iban.png';
import plusgirotIcon from '../../images/payment/plusgirot.svg';
import swishIcon from '../../images/payment/swish.svg';
import { PaymentQrType } from './paymentQr';

/** The logos in the middle of the payment QR codes, on the web page and in the PDF */
export const qrIcons: Record<PaymentQrType, string> = {
  Bankgiro: bankgiroIcon,
  PlusGirot: plusgirotIcon,
  IBAN: ibanIcon,
  Swish: swishIcon
};
