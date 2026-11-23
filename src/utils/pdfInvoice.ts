import { Ecc, QrCode } from '@rc-component/qrcode/es/libs/qrcodegen';
import dayjs, { Dayjs } from 'dayjs';
import i18next from 'i18next';
import JSZip from 'jszip';
import pdfMake from 'pdfmake/build/pdfmake';
import { Column, Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { bankQr, IPaymentQr } from '../components/invoices/paymentQr';
import { qrIcons } from '../components/invoices/paymentQrIcons';
import { IClubInfoProps, IInvoiceProps } from '../models/mobxClubModel';
import { dateFormat } from './formHelper';
import { getBase64, getLogo, IPdfSettings } from './pdf';

export const generatePdfStatus = { abortLoading: false };

export interface IInvoiceMetadata extends IInvoiceProps {
  title: string;
  startDate: Dayjs;
  endDate: Dayjs;
  dueDate: Dayjs;
}

export interface IFeesRecord {
  competitorId: number;
  description: string;
  numberOf: number;
  totalFee: number;
  feeToClub: number;
}

const feeFormat = (fee: number) =>
  new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(fee)
    .replace(/\u00A0/g, ' ');

export interface IInvoicePrintObject {
  invoiceMessage: string;
  details: IFeesRecord[];
  /** A saved invoice, its number instead of YYYY-TÄVL-AVG-competitorId */
  invoiceNumber?: string;
  /** A saved invoice, its date instead of today */
  invoiceDate?: Dayjs;
  /** The amount in the payment QR codes instead of the total, no QR codes when less than 1 (e.g. paid) */
  qrAmount?: number;
  /** A saved invoice that is paid (fully or partly), shown with what is left to pay */
  payment?: IInvoicePayment;
}

export interface IInvoicePayment {
  paidAmount: number;
  paidDate: Dayjs | null;
  leftToPay: number;
}

const paidColor = '#2e7d32';
const partlyPaidColor = '#e65100';

/** The size of the stamp text in the PDF (pt), drawn 4 times bigger so it is sharp */
const stampFontSize = 26;
const stampScale = 4;
const stampAngle = (-8 * Math.PI) / 180;

/** A tilted stamp with a frame, e.g. BETALD, as a PNG (pdfmake can't rotate text), null without a canvas */
const stampImage = (text: string, color: string): { image: string; width: number } | null => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = `bold ${stampFontSize * stampScale}px Helvetica, Arial, sans-serif`;
  ctx.font = font;
  const border = 3 * stampScale;
  const width = ctx.measureText(text).width + 2 * 12 * stampScale;
  const height = stampFontSize * stampScale + 2 * 8 * stampScale;
  const cos = Math.abs(Math.cos(stampAngle));
  const sin = Math.abs(Math.sin(stampAngle));
  canvas.width = Math.ceil(width * cos + height * sin + 2 * border);
  canvas.height = Math.ceil(width * sin + height * cos + 2 * border);
  // The state is reset when the size is set
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(stampAngle);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = border;
  ctx.beginPath();
  // roundRect is missing in older browsers
  if (typeof ctx.roundRect === 'function') ctx.roundRect(-width / 2, -height / 2, width, height, 4 * stampScale);
  else ctx.rect(-width / 2, -height / 2, width, height);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, stampScale * 2);
  return { image: canvas.toDataURL('image/png'), width: canvas.width / stampScale };
};

/** The stamp next to the invoice details and the rows after the total, nothing when nothing is paid */
const paymentContent = (payment: IInvoicePayment | undefined): { stamp: Content | null; rows: Content[][] } => {
  if (!payment || payment.paidAmount <= 0) return { stamp: null, rows: [] };
  const isPaid = payment.leftToPay <= 0;
  const stampText = i18next.t(isPaid ? 'invoice.paidStamp' : 'invoice.partlyPaidStamp');
  const stamp = stampImage(stampText, isPaid ? paidColor : partlyPaidColor);
  return {
    stamp: stamp
      ? { image: stamp.image, width: stamp.width, margin: [0, 10, 0, 0] }
      : { text: stampText, style: 'header', color: isPaid ? paidColor : partlyPaidColor, margin: [0, 10, 0, 0] },
    // The texts to the left of the amounts, the amounts under the total
    rows: [
      [
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              alignment: 'right',
              margin: [0, 0, 10, 0],
              stack: [
                payment.paidDate
                  ? `${i18next.t('invoice.paidAmount')} ${payment.paidDate.format(dateFormat)}`
                  : i18next.t('invoice.paidAmount'),
                { text: i18next.t('invoice.leftToPay'), style: 'bold' }
              ]
            },
            {
              width: '20%',
              alignment: 'right',
              stack: [feeFormat(payment.paidAmount), { text: feeFormat(payment.leftToPay), style: 'bold' }]
            }
          ]
        }
      ]
    ]
  };
};

const postSwishUrl = 'https://api.swish.nu/qr/v2/prefilled';
interface ISwishProps {
  amount: { value: number; editable: boolean };
  border: number; //Default: 1
  color: boolean;
  message: { value: string; editable: boolean };
  payee: string; // Example: "1231985837" (without space and minus)
  size: number; // Default: 1000
}

const getSwishLogo = (info: ISwishProps): Promise<string | null> =>
  new Promise(resolve => {
    fetch(postSwishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(info, (_, value) => (value === undefined ? null : value))
    })
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onerror = () => resolve(null);
        reader.onload = e => resolve(e.target ? (e.target.result as string | null) : null);
        reader.readAsDataURL(blob);
      })
      .catch(() => resolve(null));
  });

const getInvoiceSwishLogo = async (amount: number, message: string, swishNumber: string | undefined) => {
  if (!swishNumber) return null;

  return await getSwishLogo({
    amount: { value: amount, editable: false },
    border: 1,
    color: true,
    message: { value: message.substring(0, 50), editable: false },
    payee: swishNumber.replaceAll(' ', '').replaceAll('-', ''),
    size: 600
  });
};

/** The pixels of a module in the QR code image, and the white modules around it */
const qrModulePixels = 10;
const qrQuietModules = 1;
/** The logo in the middle, the same share of the width as on the web page */
const qrIconShare = 0.24;

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

/** An SVG without width and height has no size in some browsers (Firefox) and can't be drawn on a canvas */
const loadIcon = async (src: string): Promise<HTMLImageElement | null> => {
  if (!/\.svg(\?|$)|^data:image\/svg/.test(src)) return loadImage(src);
  try {
    const svg = await (await fetch(src)).text();
    const sized = svg.replace(/<svg\b(?![^>]*\swidth=)/, '<svg width="250" height="250"');
    return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`);
  } catch {
    return loadImage(src);
  }
};

/** The payment QR code with its logo in the middle as a PNG, the same as on the web page. Null without a canvas. */
const paymentQrImage = async (qr: IPaymentQr): Promise<string | null> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const modules = QrCode.encodeText(qr.value, Ecc.MEDIUM).getModules();
  const count = modules.length;
  const icon = await loadIcon(qrIcons[qr.type]);
  // The modules under the logo are left out (white), the error correction makes up for them
  const iconModules = icon ? Math.round(count * qrIconShare) : 0;
  const iconStart = Math.floor((count - iconModules) / 2);
  const underIcon = (n: number) => n >= iconStart && n < iconStart + iconModules;
  canvas.width = canvas.height = (count + 2 * qrQuietModules) * qrModulePixels;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark && !(underIcon(x) && underIcon(y))) {
        ctx.fillRect(
          (x + qrQuietModules) * qrModulePixels,
          (y + qrQuietModules) * qrModulePixels,
          qrModulePixels,
          qrModulePixels
        );
      }
    })
  );
  if (icon) {
    const inset = qrModulePixels / 2;
    const side = iconModules * qrModulePixels - 2 * inset;
    const start = (iconStart + qrQuietModules) * qrModulePixels + inset;
    ctx.drawImage(icon, start, start, side, side);
  }
  return canvas.toDataURL('image/png');
};

/** The size of the QR codes in the PDF (pt) */
const pdfQrSize = 80;

/** A QR code with a small help text in italic below it */
const qrColumn = (image: string, helpText: string): Column => ({
  width: pdfQrSize,
  stack: [
    { image, fit: [pdfQrSize, pdfQrSize] },
    { text: helpText, italics: true, fontSize: 7, alignment: 'center', margin: [0, 1, 0, 0] }
  ]
});

const getPdfDocDefinition = async (
  proxyurl: string,
  logo: string | null,
  clubInfo: IClubInfoProps,
  invoiceMetaData: IInvoiceMetadata,
  printObjects: IInvoicePrintObject[],
  pdfSettings: IPdfSettings,
  setProcessed: (value: React.SetStateAction<number>) => void,
  setSpinnerText: (value: string | null) => void
): Promise<TDocumentDefinitions> => {
  const docDefinition: TDocumentDefinitions = {
    info: {
      title: invoiceMetaData.title,
      author: 'GIK-programmet 4.0',
      subject: invoiceMetaData.title,
      keywords: invoiceMetaData.title
    },
    pageSize: pdfSettings.pageSize,
    pageOrientation: pdfSettings.pageOrientation,
    pageMargins: pdfSettings.pageMargins,
    header: undefined,
    content: [],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 0]
      },
      subHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      normal11: {
        fontSize: 11,
        bold: true
      },
      bold: {
        fontSize: 11,
        bold: true
      },
      marginBottom: {
        margin: [0, 0, 0, 10]
      },
      marginRight: {
        margin: [0, 0, 10, 0]
      },
      tableStyle: {
        margin: [0, 0, 0, 5]
      }
    },
    defaultStyle: {
      fontSize: 10
    }
  };
  for (let index = 0; index < printObjects.length; index++) {
    const printObject = printObjects[index];
    setSpinnerText(`${printObject.invoiceMessage}.pdf`);
    const totalFeeToClub = printObject.details.map(detail => detail.feeToClub).reduce((prev, curr) => prev + curr, 0);
    const taxFee = (totalFeeToClub * (invoiceMetaData.taxPercentage ?? 0)) / 100;
    const excludingTax = totalFeeToClub - taxFee;
    const invoiceDate = printObject.invoiceDate ?? dayjs();
    const invoiceNumber =
      printObject.invoiceNumber ??
      `${invoiceMetaData.endDate.format('YYYY')}-TÄVL-AVG-${printObject.details.find(() => true)?.competitorId ?? 99999}`;
    const qrAmount = printObject.qrAmount ?? totalFeeToClub;
    const swishLogo =
      qrAmount >= 1
        ? await getInvoiceSwishLogo(qrAmount, printObject.invoiceMessage, invoiceMetaData.swishNumber)
        : null;
    const bankQrImage =
      qrAmount >= 1 && invoiceMetaData.accountType && invoiceMetaData.account?.trim()
        ? await paymentQrImage(
            bankQr(invoiceMetaData.accountType, invoiceMetaData.account, clubInfo, {
              invoiceId: invoiceNumber,
              message: printObject.invoiceMessage,
              invoiceDate: invoiceDate.format('YYYY-MM-DD'),
              dueDate: invoiceMetaData.dueDate.format('YYYY-MM-DD'),
              amount: qrAmount
            })
          )
        : null;
    // The bank account first and then Swish, the same as on the web page
    const qrColumns: Column[] = [
      ...(bankQrImage
        ? [qrColumn(bankQrImage, i18next.t('invoice.qrScanBank', { type: invoiceMetaData.accountType }))]
        : []),
      ...(swishLogo ? [qrColumn(swishLogo, i18next.t('invoice.qrScanSwish'))] : [])
    ];
    const payment = paymentContent(printObject.payment);
    const headerData: Column = {
      width: '*',
      alignment: 'left',
      stack: [
        {
          text: i18next.t('invoice.invoiceTitle') ?? '',
          style: 'header'
        },
        { text: invoiceMetaData.title, style: 'subHeader' },
        {
          style: 'marginBottom',
          columns: [
            {
              alignment: 'left',
              width: 'auto',
              style: 'marginRight',
              stack: [
                { text: `${i18next.t('invoice.invoiceDate')}: `, style: 'bold' },
                {
                  text: `${i18next.t('invoice.invoiceNumber')}: `,
                  style: 'bold'
                },
                {
                  text: `${i18next.t('invoice.dueDate')}: `,
                  style: 'bold'
                },
                `${i18next.t('invoice.paymentMethods')}: `,
                `${i18next.t('invoice.organizationNumber')}: `,
                `${i18next.t('invoice.address')}: `
              ]
            },
            {
              alignment: 'left',
              width: 'auto',
              stack: [
                { text: invoiceDate.format(dateFormat), style: 'bold' },
                { text: invoiceNumber, style: 'bold' },
                {
                  text: invoiceMetaData.dueDate.format(dateFormat),
                  style: 'bold'
                },
                [invoiceMetaData.accountType, invoiceMetaData.swishNumber ? 'Swish' : undefined]
                  .filter(method => method != null)
                  .join(', '),
                clubInfo.organisationNumber,
                clubInfo.name,
                clubInfo.address1,
                clubInfo.address2 ?? null,
                clubInfo.zip,
                clubInfo.city
              ].filter(stack => stack != null) as Content[]
            },
            // In the empty space to the right of the details
            ...(payment.stamp ? [{ width: '*', alignment: 'center', stack: [payment.stamp] } as Column] : [])
          ]
        }
      ]
    };
    if (!Array.isArray(docDefinition.content)) throw new Error('Implemetation error');
    docDefinition.content.push({
      pageBreak: index > 0 ? 'before' : undefined,
      columns: logo
        ? [
            headerData,
            {
              width: 'auto',
              alignment: 'right',
              stack: [{ image: logo, fit: [80, 80] }]
            }
          ]
        : [headerData]
    });
    docDefinition.content.push({
      style: 'tableStyle',
      layout: 'borderLayout',
      table: {
        widths: ['*'],
        body: [
          [
            {
              columns: [
                {
                  width: '52%',
                  alignment: 'left',
                  text: i18next.t('invoice.desription') ?? ''
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: i18next.t('invoice.numberOf') ?? ''
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: i18next.t('invoice.totalFee') ?? ''
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: i18next.t('invoice.clubDiscount') ?? ''
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: i18next.t('invoice.sum') ?? ''
                }
              ]
            }
          ]
        ]
      }
    });
    docDefinition.content.push({
      style: 'tableStyle',
      layout: 'borderLayout',
      table: {
        widths: ['100%'],
        body: [
          ...printObject.details.map((detail): Content[] => [
            {
              columns: [
                {
                  width: '52%',
                  alignment: 'left',
                  text: detail.description ?? ''
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: detail.numberOf.toString()
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: feeFormat(detail.totalFee)
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: feeFormat(detail.totalFee - detail.feeToClub)
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: feeFormat(detail.feeToClub)
                }
              ]
            }
          ]),
          [
            {
              columns: [
                {
                  width: '35%',
                  alignment: 'left',
                  text: ''
                },
                {
                  width: '15%',
                  alignment: 'left',
                  stack: [i18next.t('invoice.excludingTax') ?? '', { text: feeFormat(excludingTax), style: 'normal11' }]
                },
                {
                  width: '15%',
                  alignment: 'left',
                  stack: [
                    i18next.t('invoice.taxPercentage') ?? '',
                    { text: invoiceMetaData.taxPercentage?.toString() ?? '0', style: 'normal11' }
                  ]
                },
                {
                  width: '15%',
                  alignment: 'left',
                  stack: [i18next.t('invoice.taxFee') ?? '', { text: feeFormat(taxFee), style: 'normal11' }]
                },
                {
                  width: '20%',
                  alignment: 'right',
                  stack: [
                    { text: i18next.t('invoice.total') ?? '', style: 'bold' },
                    { text: feeFormat(totalFeeToClub), style: 'bold' }
                  ]
                }
              ]
            }
          ],
          ...payment.rows,
          [
            {
              columns: [
                {
                  width: '*',
                  alignment: 'left',
                  stack: [
                    {
                      text: `${i18next.t('invoice.message')}: ${printObject.invoiceMessage}`,
                      style: 'bold'
                    },
                    invoiceMetaData.accountType
                      ? {
                          text: `${invoiceMetaData.accountType}: ${invoiceMetaData.account}`,
                          style: 'bold'
                        }
                      : null,
                    invoiceMetaData.swishNumber
                      ? {
                          text: `Swish: ${invoiceMetaData.swishNumber}`,
                          style: 'bold'
                        }
                      : null
                  ].filter(stack => stack != null)
                },
                ...(qrColumns.length > 0 ? [{ width: 'auto', columns: qrColumns, columnGap: 10 } as Column] : [])
              ]
            }
          ]
        ]
      }
    });
    if (generatePdfStatus.abortLoading) throw new Error();
    setProcessed(oldValue => oldValue + 1);
  }
  pdfMake.setTableLayouts({
    borderLayout: {
      hLineWidth: function (i, node) {
        return i === 0 || i === node.table.body.length ? 1 : 0; // Border only at the top and bottom of the table
      },
      vLineWidth: function (i, node) {
        return i === 0 || i === node.table.widths?.length ? 1 : 0; // Border only at the left and right of the table
      },
      hLineColor: function () {
        return '#000000';
      },
      vLineColor: function () {
        return '#000000';
      },
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 3,
      paddingBottom: () => 3
    }
  });
  return docDefinition;
};

export const getInvoicePdf = async (
  proxyurl: string,
  logoUrl: string,
  clubInfo: IClubInfoProps,
  invoiceMetaData: IInvoiceMetadata,
  printObjects: IInvoicePrintObject[],
  pdfSettings: IPdfSettings,
  setProcessed: (value: React.SetStateAction<number>) => void,
  setSpinnerText: (value: string | null) => void
): Promise<void> => {
  const logo = await getLogo(proxyurl, logoUrl);
  const docDefinition = await getPdfDocDefinition(
    proxyurl,
    logo,
    clubInfo,
    invoiceMetaData,
    printObjects,
    pdfSettings,
    setProcessed,
    setSpinnerText
  );

  if (generatePdfStatus.abortLoading) throw new Error();

  pdfMake
    .createPdf(docDefinition)
    .download(
      `${
        printObjects.length > 1
          ? invoiceMetaData.title
          : printObjects.length === 1
            ? printObjects[0].invoiceMessage
            : 'No data'
      }.pdf`
    );
};

export const getInvoiceZip = async (
  proxyurl: string,
  logoUrl: string,
  clubInfo: IClubInfoProps,
  invoiceMetaData: IInvoiceMetadata,
  printObjects: IInvoicePrintObject[],
  pdfSettings: IPdfSettings,
  setProcessed: (value: React.SetStateAction<number>) => void,
  setSpinnerText: (value: string | null) => void
): Promise<void> => {
  const logo = await getLogo(proxyurl, logoUrl);
  const zip = new JSZip();

  for (const printObject of printObjects) {
    const docDefinition = await getPdfDocDefinition(
      proxyurl,
      logo,
      clubInfo,
      invoiceMetaData,
      [printObject],
      pdfSettings,
      setProcessed,
      setSpinnerText
    );
    const data = await getBase64(pdfMake.createPdf(docDefinition));
    zip.file(`${printObject.invoiceMessage}.pdf`, data, { base64: true });
    if (generatePdfStatus.abortLoading) throw new Error();
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/zip' });
  const link = document.createElement('a');
  link.download = `${invoiceMetaData.title}.zip`;
  link.href = URL.createObjectURL(blob);
  link.click();
};
