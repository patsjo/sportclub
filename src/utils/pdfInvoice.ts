import JSZip from 'jszip';
import { getBase64, getLogo, IPdfSettings } from './pdf';
import pdfMake from 'pdfmake/build/pdfmake';
import { IClubInfoProps, IInvoiceProps } from 'models/mobxClubModel';
import { Column, Content, ContentColumns, TDocumentDefinitions } from 'pdfmake/interfaces';
import i18next from 'i18next';
import moment, { Moment } from 'moment';
import { dateFormat } from './formHelper';
import { generatePdfStatus } from 'components/results/ResultsFees';

export interface IInvoiceMetadata extends IInvoiceProps {
  title: string;
  startDate: Moment;
  endDate: Moment;
  dueDate: Moment;
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
    maximumFractionDigits: 2,
  })
    .format(fee)
    .replace(/\u00A0/g, ' ');

export interface IInvoicePrintObject {
  invoiceMessage: string;
  details: IFeesRecord[];
}

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
  new Promise((resolve) => {
    fetch(postSwishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(info),
    })
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onerror = () => resolve(null);
        reader.onload = (e) => resolve(e.target ? (e.target.result as string | null) : null);
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
    size: 600,
  });
};

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
      keywords: invoiceMetaData.title,
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
        margin: [0, 0, 0, 0],
      },
      subHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      normal11: {
        fontSize: 11,
        bold: true,
      },
      bold: {
        fontSize: 11,
        bold: true,
      },
      marginBottom: {
        margin: [0, 0, 0, 10],
      },
      marginRight: {
        margin: [0, 0, 10, 0],
      },
      tableStyle: {
        margin: [0, 0, 0, 5],
      },
    },
    defaultStyle: {
      fontSize: 10,
    },
  };
  for (let index = 0; index < printObjects.length; index++) {
    const printObject = printObjects[index];
    setSpinnerText(`${printObject.invoiceMessage}.pdf`);
    const totalFeeToClub = printObject.details.map((detail) => detail.feeToClub).reduce((prev, curr) => prev + curr, 0);
    const taxFee = (totalFeeToClub * (invoiceMetaData.taxPercentage ?? 0)) / 100;
    const excludingTax = totalFeeToClub - taxFee;
    const swishLogo = await getInvoiceSwishLogo(
      totalFeeToClub,
      printObject.invoiceMessage,
      invoiceMetaData.swishNumber
    );
    const headerData: Column = {
      width: '*',
      alignment: 'left',
      stack: [
        { text: i18next.t('invoice.invoiceTitle') ?? '', style: 'header' },
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
                  style: 'bold',
                },
                {
                  text: `${i18next.t('invoice.dueDate')}: `,
                  style: 'bold',
                },
                `${i18next.t('invoice.paymentMethods')}: `,
                `${i18next.t('invoice.organizationNumber')}: `,
                `${i18next.t('invoice.address')}: `,
              ],
            },
            {
              alignment: 'left',
              width: 'auto',
              stack: [
                { text: moment().format(dateFormat), style: 'bold' },
                {
                  text: `${invoiceMetaData.endDate.format('YYYY')}-TÄVL-AVG-${
                    printObject.details.find(() => true)?.competitorId ?? 99999
                  }`,
                  style: 'bold',
                },
                {
                  text: invoiceMetaData.dueDate.format(dateFormat),
                  style: 'bold',
                },
                [invoiceMetaData.accountType, invoiceMetaData.swishNumber ? 'Swish' : undefined]
                  .filter((method) => method != null)
                  .join(', '),
                clubInfo.organisationNumber,
                clubInfo.name,
                clubInfo.address1,
                clubInfo.address2 ?? null,
                clubInfo.zip,
                clubInfo.city,
              ].filter((stack) => stack != null) as Content[],
            },
          ],
        },
      ],
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
              stack: [{ image: logo, fit: [80, 80] }],
            },
          ]
        : [headerData],
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
                  text: i18next.t('invoice.desription') ?? '',
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: i18next.t('invoice.numberOf') ?? '',
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: i18next.t('invoice.totalFee') ?? '',
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: i18next.t('invoice.clubDiscount') ?? '',
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: i18next.t('invoice.sum') ?? '',
                },
              ],
            },
          ],
        ],
      },
    });
    docDefinition.content.push({
      style: 'tableStyle',
      layout: 'borderLayout',
      table: {
        widths: ['100%'],
        body: [
          ...printObject.details.map((detail) => [
            {
              columns: [
                {
                  width: '52%',
                  alignment: 'left',
                  text: detail.description ?? '',
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: detail.numberOf.toString(),
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: feeFormat(detail.totalFee),
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: feeFormat(detail.totalFee - detail.feeToClub),
                },
                {
                  width: '12%',
                  alignment: 'right',
                  text: feeFormat(detail.feeToClub),
                },
              ],
            },
          ]),
          [
            {
              columns: [
                {
                  width: '35%',
                  alignment: 'left',
                  text: '',
                },
                {
                  width: '15%',
                  alignment: 'left',
                  stack: [
                    i18next.t('invoice.excludingTax') ?? '',
                    { text: feeFormat(excludingTax), style: 'normal11' },
                  ],
                },
                {
                  width: '15%',
                  alignment: 'left',
                  stack: [
                    i18next.t('invoice.taxPercentage') ?? '',
                    { text: invoiceMetaData.taxPercentage?.toString() ?? '0', style: 'normal11' },
                  ],
                },
                {
                  width: '15%',
                  alignment: 'left',
                  stack: [i18next.t('invoice.taxFee') ?? '', { text: feeFormat(taxFee), style: 'normal11' }],
                },
                {
                  width: '20%',
                  alignment: 'right',
                  stack: [
                    { text: i18next.t('invoice.total') ?? '', style: 'bold' },
                    { text: feeFormat(totalFeeToClub), style: 'bold' },
                  ],
                },
              ],
            },
          ],
          [
            {
              columns: [
                {
                  width: '*',
                  alignment: 'left',
                  stack: [
                    {
                      text: `${i18next.t('invoice.message')}: ${printObject.invoiceMessage}`,
                      style: 'bold',
                    },
                    invoiceMetaData.accountType
                      ? {
                          text: `${invoiceMetaData.accountType}: ${invoiceMetaData.account}`,
                          style: 'bold',
                        }
                      : null,
                    invoiceMetaData.swishNumber
                      ? {
                          text: `Swish: ${invoiceMetaData.swishNumber}`,
                          style: 'bold',
                        }
                      : null,
                  ].filter((stack) => stack != null),
                },
                {
                  width: 'auto',
                  alignment: 'right',
                  stack: [swishLogo ? { image: swishLogo, fit: [80, 80] } : null].filter(
                    (stack) => stack != null
                  ) as Content[],
                },
              ],
            },
          ],
        ],
      },
    });
    if (generatePdfStatus.abortLoading) throw new Error();
    setProcessed((oldValue) => oldValue + 1);
  }
  pdfMake.tableLayouts = {
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
      paddingBottom: () => 3,
    },
  };
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
