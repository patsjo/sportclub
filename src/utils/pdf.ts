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
  TableCell,
  TDocumentDefinitions
} from 'pdfmake/interfaces';

pdfMake.vfs = pdfFonts.vfs;

export interface IPdfSettings {
  pageSize: PageSize;
  pageOrientation: PageOrientation;
  pageMargins: Margins;
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
export const getLogo = (corsProxy: string, logoUrl: string): Promise<string | null> =>
  new Promise((resolve, reject) => {
    fetch(corsProxy ? `${corsProxy}${encodeURIComponent(logoUrl)}&noJsonConvert=true` : logoUrl)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = e => resolve(e.target ? (e.target.result as string | null) : null);
        reader.readAsDataURL(blob);
      });
  });

const getTableContent = <T extends object>(table: IPrintTable<T>): ContentTable => {
  const contentDefinition: ContentTable = {
    style: 'tableStyle',
    table: {
      headerRows: 1,
      body: []
    },
    layout: 'compactHorizontalLines'
  };
  contentDefinition.table.body.push(table.columns.map(col => ({ text: col.title, style: 'tableHeader' })));
  table.dataSource.forEach(record => {
    contentDefinition.table.body.push(
      table.columns.map((col, index) => {
        let value: TableCell = '';
        if (col.key) value = record[col.key as keyof T] as TableCell;
        if (col.render) {
          const renderValue = col.render(value, record, index) ?? '';
          if (renderValue === false) value = 'false';
          else if (renderValue === true) value = 'true';
          else value = renderValue as TableCell;
        }
        return value;
      })
    );
  });

  return contentDefinition;
};

const getPdfDocDefinition = <T extends object>(
  logo: string | null,
  title: string,
  printObjects: IPrintObject<T>[],
  pdfSettings: IPdfSettings
): TDocumentDefinitions => {
  const docDefinition: TDocumentDefinitions = {
    info: {
      title: title,
      author: 'GIK-programmet 4.0',
      subject: title,
      keywords: title
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
        margin: [0, 0, 0, 10]
      },
      tableStyle: {
        margin: [0, 5, 0, 5]
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'black'
      }
    },
    defaultStyle: {
      fontSize: 10
    }
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
                ...printObject.inputs.map(input => `${input.label}: ${input.value}`)
              ]
            },
            {
              width: 'auto',
              alignment: 'right',
              stack: [{ image: logo, fit: [40, 45] }]
            }
          ]
        : [
            {
              width: '*',
              alignment: 'left',
              stack: [
                { text: printObject.header, style: 'header' },
                ...printObject.inputs.map(input => `${input.label}: ${input.value}`)
              ]
            }
          ]
    };
    if (!Array.isArray(docDefinition.content)) throw new Error('Implemetation error');
    docDefinition.content.push(content);
    printObject.tables.forEach(table => {
      if (Array.isArray(docDefinition.content)) docDefinition.content.push(getTableContent(table));
    });
  });
  pdfMake.tableLayouts = {
    compactHorizontalLines: {
      hLineWidth: (i, node) => {
        if (i === 0 || i === node.table.body.length) {
          return 0;
        }
        return i === node.table.headerRows ? 2 : 1;
      },
      vLineWidth: () => {
        return 0;
      },
      hLineColor: i => {
        return i === 1 ? 'black' : '#aaa';
      },
      paddingLeft: i => {
        return i === 0 ? 0 : 3;
      },
      paddingRight: (i, node) => {
        return Array.isArray(node.table.widths) && i === node.table.widths.length - 1 ? 0 : 3;
      }
    }
  };
  return docDefinition;
};

export const getPdf = async <T extends object>(
  proxyurl: string,
  logoUrl: string,
  title: string,
  printObjects: IPrintObject<T>[],
  pdfSettings: IPdfSettings
): Promise<void> => {
  const logo = await getLogo(proxyurl, logoUrl);
  const docDefinition = getPdfDocDefinition(logo, title, printObjects, pdfSettings);

  pdfMake.createPdf(docDefinition).download(`${title}.pdf`);
};

export const getBase64 = (pdfDocument: pdfMake.TCreatedPdf): Promise<string> => {
  return new Promise(resolve => {
    pdfDocument.getBase64(data => {
      resolve(data);
    });
  });
};

export const getZip = async <T extends object>(
  proxyurl: string,
  logoUrl: string,
  title: string,
  printObjects: IPrintObject<T>[],
  pdfSettings: IPdfSettings
): Promise<void> => {
  const logo = await getLogo(proxyurl, logoUrl);
  const zip = new JSZip();

  for (const printObject of printObjects) {
    const docDefinition = getPdfDocDefinition(logo, title, [printObject], pdfSettings);
    const data = await getBase64(pdfMake.createPdf(docDefinition));
    zip.file(`${printObject.header}.pdf`, data, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/zip' });
  const link = document.createElement('a');
  link.download = `${title}.zip`;
  link.href = URL.createObjectURL(blob);
  link.click();
};
