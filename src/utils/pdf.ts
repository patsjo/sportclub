import { ColumnType } from 'antd/lib/table';
import JSZip from 'jszip';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  ContentColumns,
  ContentTable,
  Margins,
  PageOrientation,
  PageSize,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

export interface IPdfSettings {
  pageSize: PageSize;
  pageOrientation: PageOrientation;
  pageMargins: Margins;
}

interface ResultsFeesRecord {
  competitorId: number;
  originalFee: number;
  lateFee: number;
  feeToClub: number;
  serviceFeeToClub: number;
  totalFeeToClub: number;
}

export interface IPrintTableColumn<RecordType> extends ColumnType<RecordType> {
  key: string;
  selected: boolean;
  title: string;
}

export interface IPrintTable<RecordType> {
  columns: IPrintTableColumn<RecordType>[];
  dataSource: RecordType[];
}

export interface IPrintInput {
  label: string;
  value: string;
}

export interface IPrintObject<RecordType> {
  header: string;
  inputs: IPrintInput[];
  tables: IPrintTable<RecordType>[];
}
const getLogo = (corsProxy: string, logoUrl: string): Promise<string | null> =>
  new Promise((resolve, reject) => {
    fetch(corsProxy ? `${corsProxy}${encodeURIComponent(logoUrl)}&noJsonConvert=true` : logoUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => resolve(e.target ? (e.target.result as string | null) : null);
        reader.readAsDataURL(blob);
      });
  });

const getTableContent = (table: IPrintTable<any>): ContentTable => {
  const contentDefinition: ContentTable = {
    style: 'tableStyle',
    table: {
      headerRows: 1,
      body: [],
    },
    layout: 'compactHorizontalLines',
  };
  contentDefinition.table.body.push(table.columns.map((col) => ({ text: col.title, style: 'tableHeader' })));
  table.dataSource.forEach((record) => {
    contentDefinition.table.body.push(
      table.columns.map((col, index) => {
        let value: any = null;
        if (col.key) value = record[col.key];
        if (col.render) {
          value = col.render(value, record, index);
        }
        return value;
      })
    );
  });

  return contentDefinition;
};

const getPdfDocDefinition = (
  logo: string | null,
  title: string,
  printObjects: IPrintObject<any>[],
  pdfSettings: IPdfSettings
): TDocumentDefinitions => {
  const docDefinition: TDocumentDefinitions = {
    info: {
      title: title,
      author: 'GIK-programmet 4.0',
      subject: title,
      keywords: title,
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
        margin: [0, 0, 0, 10],
      },
      tableStyle: {
        margin: [0, 5, 0, 5],
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'black',
      },
    },
    defaultStyle: {
      fontSize: 10,
    },
  };
  printObjects.forEach((printObject, index: number) => {
    const content: ContentColumns = {
      pageBreak: index > 0 ? 'before' : undefined,
      columns: logo
        ? [
            {
              width: '*',
              alignment: 'left',
              stack: [
                { text: printObject.header, style: 'header' },
                ...printObject.inputs.map((input) => `${input.label}: ${input.value}`),
              ],
            },
            {
              width: 'auto',
              alignment: 'right',
              stack: [{ image: logo, fit: [40, 45] }],
            },
          ]
        : [
            {
              width: '*',
              alignment: 'left',
              stack: [
                { text: printObject.header, style: 'header' },
                ...printObject.inputs.map((input) => `${input.label}: ${input.value}`),
              ],
            },
          ],
    };
    Array.isArray(docDefinition.content) && docDefinition.content.push(content);
    printObject.tables.forEach((table) => {
      Array.isArray(docDefinition.content) && docDefinition.content.push(getTableContent(table));
    });
  });
  pdfMake.tableLayouts = {
    compactHorizontalLines: {
      hLineWidth: function (i, node) {
        if (i === 0 || i === node.table.body.length) {
          return 0;
        }
        return i === node.table.headerRows ? 2 : 1;
      },
      vLineWidth: function (i) {
        return 0;
      },
      hLineColor: function (i) {
        return i === 1 ? 'black' : '#aaa';
      },
      paddingLeft: function (i) {
        return i === 0 ? 0 : 3;
      },
      paddingRight: function (i, node) {
        return Array.isArray(node.table.widths) && i === node.table.widths.length - 1 ? 0 : 3;
      },
    },
  };
  return docDefinition;
};

export const getPdf = (
  proxyurl: string,
  logoUrl: string,
  title: string,
  printObjects: IPrintObject<any>[],
  pdfSettings: IPdfSettings
): Promise<void> =>
  new Promise((resolve, reject) => {
    getLogo(proxyurl, logoUrl)
      .then((logo) => {
        const docDefinition = getPdfDocDefinition(logo, title, printObjects, pdfSettings);

        pdfMake.createPdf(docDefinition).download(`${title}.pdf`);
        resolve();
      })
      .catch((error) => reject(error));
  });

const getBase64 = (pdfDocument: pdfMake.TCreatedPdf): Promise<string> => {
  return new Promise((resolve) => {
    pdfDocument.getBase64((data) => {
      resolve(data);
    });
  });
};

export const getZip = (
  proxyurl: string,
  logoUrl: string,
  title: string,
  printObjects: IPrintObject<any>[],
  pdfSettings: IPdfSettings
): Promise<void> =>
  new Promise((resolve, reject) => {
    getLogo(proxyurl, logoUrl)
      .then(async (logo) => {
        const zip = new JSZip();

        for (const printObject of printObjects) {
          const docDefinition = getPdfDocDefinition(logo, title, [printObject], pdfSettings);
          const data = await getBase64(pdfMake.createPdf(docDefinition));
          zip.file(`${printObject.header}.pdf`, data, { base64: true });
        }

        zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/zip' }).then((blob) => {
          const link = document.createElement('a');
          link.download = `${title}.zip`;
          link.href = URL.createObjectURL(blob);
          link.click();
          resolve();
        });
      })
      .catch((error) => reject(error));
  });
