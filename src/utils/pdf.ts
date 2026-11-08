import { TableProps } from 'antd';
import JSZip from 'jszip';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  Content,
  ContentColumns,
  ContentTable,
  CustomTableLayout,
  Margins,
  PageOrientation,
  PageSize,
  TableCell,
  TDocumentDefinitions
} from 'pdfmake/interfaces';

pdfMake.addVirtualFileSystem(pdfFonts);

export interface IPdfSettings {
  pageSize: PageSize;
  pageOrientation: PageOrientation;
  pageMargins: Margins;
}

export type IPrintTableColumn<RecordType> = NonNullable<TableProps<RecordType>['columns']>[number] & {
  key: string;
  selected: boolean;
  title: string;
};

export interface IPrintTable<RecordType> {
  columns: IPrintTableColumn<RecordType>[];
  dataSource: RecordType[];
  /** A row shown as a part of the row above it, in italics and without a line between (e.g. a total) */
  isSubRow?: (record: RecordType) => boolean;
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

/** The size of the text in the tables when they fit on the page */
export const PdfTableFontSize = 10;
/** The text is never made smaller than this, a table that still does not fit is cut at the edge */
const MinTableFontSize = 4;
/** The margin to the left and right of the reduced margins */
export const PdfReducedMargin = 5;
/** The color of a sub row, 80 % black */
const SubRowColor = '#333333';

/** The width of a table: the text, which scales with the size of the text, and the paddings between the columns */
export interface IPdfTableWidth {
  textWidth: number;
  fixedWidth: number;
}

/** The current settings, or what is changed: larger paper, landscape and reduced margins */
export type PdfFitOptionKey =
  | 'current'
  | 'ReducedMargins'
  | 'Landscape'
  | 'LandscapeReducedMargins'
  | 'A3'
  | 'A3ReducedMargins'
  | 'A3Landscape'
  | 'A3LandscapeReducedMargins';

export interface IPdfFitOption {
  key: PdfFitOptionKey;
  settings: IPdfSettings;
  /** The smallest text of the tables */
  fontSize: number;
}

export interface IPdfFit {
  /** The number of tables too wide for the page with the current settings */
  tooWide: number;
  total: number;
  /** The current settings first, then the alternatives that give larger text */
  options: IPdfFitOption[];
}

/** Asked when a table is too wide for the page, the settings to use or undefined to cancel */
export type PdfFitConfirm = (fit: IPdfFit) => Promise<IPdfSettings | undefined>;

/** How far the making of the PDF has come: the widths of the tables measured, then the files made */
export type PdfProgress = (phase: 'measure' | 'create', done: number, total: number, text?: string) => void;

/** Time for the browser to show the progress before the heavy work, which holds the browser while it runs */
const showProgress = () => new Promise(resolve => setTimeout(resolve, 50));

const pageWidths: Record<string, { width: number; height: number }> = {
  A3: { width: 841.89, height: 1190.55 },
  A4: { width: 595.28, height: 841.89 }
};

const horizontalMargins = (margins: Margins): [number, number] => {
  if (typeof margins === 'number') return [margins, margins];
  if (margins.length === 2) return [margins[0], margins[0]];
  return [margins[0], margins[2]];
};

/** The width of the page between the margins */
export const PdfAvailableWidth = (settings: IPdfSettings): number => {
  const size =
    typeof settings.pageSize === 'string'
      ? (pageWidths[settings.pageSize] ?? pageWidths.A4)
      : { width: settings.pageSize.width, height: settings.pageSize.height === 'auto' ? 0 : settings.pageSize.height };
  const width = settings.pageOrientation === 'landscape' ? Math.max(size.width, size.height) : size.width;
  const [left, right] = horizontalMargins(settings.pageMargins);
  return width - left - right;
};

/** The largest text, at most the normal size, that the table fits with on the page, rounded down to tenths */
export const PdfFitFontSize = (tableWidth: IPdfTableWidth, settings: IPdfSettings): number => {
  const available = PdfAvailableWidth(settings) - tableWidth.fixedWidth;
  if (tableWidth.textWidth <= available) return PdfTableFontSize;
  const fontSize = Math.floor(((PdfTableFontSize * available) / tableWidth.textWidth) * 10) / 10;
  return Math.max(MinTableFontSize, Math.min(PdfTableFontSize, fontSize));
};

/** What the text of the tables would be with the current settings and the alternatives */
export const GetPdfFit = (tableWidths: IPdfTableWidth[], settings: IPdfSettings): IPdfFit => {
  const smallest = (optionSettings: IPdfSettings) =>
    tableWidths.reduce(
      (size, tableWidth) => Math.min(size, PdfFitFontSize(tableWidth, optionSettings)),
      PdfTableFontSize
    );
  const [left, right] = horizontalMargins(settings.pageMargins);
  const margins =
    Array.isArray(settings.pageMargins) && settings.pageMargins.length === 4 ? settings.pageMargins : null;
  const reducedMargins: Margins = margins
    ? [PdfReducedMargin, margins[1], PdfReducedMargin, margins[3]]
    : [PdfReducedMargin, PdfReducedMargin, PdfReducedMargin, PdfReducedMargin];
  const canReduceMargins = left > PdfReducedMargin || right > PdfReducedMargin;
  const canTurn = settings.pageOrientation !== 'landscape';

  const options: IPdfFitOption[] = [];
  // The paper of the settings, and the larger paper. Within a paper the simplest change comes first, the changes
  // after the first one that fits with the normal text are not needed.
  [false, ...(settings.pageSize === 'A4' ? [true] : [])].forEach(a3 => {
    const changes = [
      { landscape: false, reduced: false },
      { landscape: false, reduced: true },
      { landscape: true, reduced: false },
      { landscape: true, reduced: true }
    ].filter(change => (!change.landscape || canTurn) && (!change.reduced || canReduceMargins));
    for (const change of changes) {
      const optionSettings: IPdfSettings = {
        ...settings,
        ...(a3 ? { pageSize: 'A3' } : {}),
        ...(change.landscape ? { pageOrientation: 'landscape' } : {}),
        ...(change.reduced ? { pageMargins: reducedMargins } : {})
      };
      const key = `${a3 ? 'A3' : ''}${change.landscape ? 'Landscape' : ''}${change.reduced ? 'ReducedMargins' : ''}`;
      const fontSize = smallest(optionSettings);
      options.push({ key: (key || 'current') as PdfFitOptionKey, settings: optionSettings, fontSize });
      if (fontSize >= PdfTableFontSize) break;
    }
  });
  return {
    tooWide: tableWidths.filter(tableWidth => PdfFitFontSize(tableWidth, settings) < PdfTableFontSize).length,
    total: tableWidths.length,
    options
  };
};

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

/** The table layout, a sub row has no line above it and sits close to the row it belongs to */
const tableLayout = (subRows: Set<number>, onMeasured?: (tableWidth: IPdfTableWidth) => void): CustomTableLayout => ({
  hLineWidth: (i, node) => {
    if (i === 0 && onMeasured) {
      // The table is measured before it is laid out, the widths of the columns are known here
      const widths = (node.table.widths ?? []) as unknown as { _minWidth?: number }[];
      const offsets = (node as unknown as { _offsets?: { total?: number } })._offsets;
      onMeasured({
        textWidth: widths.reduce((sum, width) => sum + (width._minWidth ?? 0), 0),
        fixedWidth: offsets?.total ?? 0
      });
    }
    if (i === 0 || i === node.table.body.length || subRows.has(i)) {
      return 0;
    }
    return i === node.table.headerRows ? 2 : 1;
  },
  vLineWidth: () => 0,
  hLineColor: i => (i === 1 ? 'black' : '#aaa'),
  paddingLeft: i => (i === 0 ? 0 : 3),
  paddingRight: (i, node) => (Array.isArray(node.table.widths) && i === node.table.widths.length - 1 ? 0 : 3),
  paddingTop: i => (subRows.has(i) ? 0 : 2),
  paddingBottom: i => (subRows.has(i + 1) ? 0 : 2)
});

/** A text indented a little, e.g. "Total" on the row of a total */
export const PdfIndentedText = (text: string) => ({ text, pdfIndent: true });

const toCell = (value: unknown, style: Record<string, unknown>, fontSize: number): TableCell => {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    const { pdfIndent, ...cell } = value as { pdfIndent?: boolean };
    // The indent grows with the text, then the width of the table does too
    return { ...cell, ...style, ...(pdfIndent ? { margin: [0.3 * fontSize, 0, 0, 0] } : {}) } as TableCell;
  }
  return { text: value == null ? '' : String(value), ...style } as TableCell;
};

const getTableContent = <T extends object>(
  table: IPrintTable<T>,
  fontSize: number,
  onMeasured?: (tableWidth: IPdfTableWidth) => void
): ContentTable => {
  const subRows = new Set<number>();
  const body: TableCell[][] = [
    table.columns.map(col => ({ text: col.title, style: 'tableHeader', fontSize: fontSize }))
  ];
  const subRowStyle = { italics: true, color: SubRowColor };
  table.dataSource.forEach(record => {
    const isSubRow = !!table.isSubRow?.(record);
    if (isSubRow) subRows.add(body.length);
    body.push(
      table.columns.map((col, index) => {
        let value: unknown = '';
        if (col.key) value = record[col.key as keyof T];
        if (col.render) {
          const renderValue = col.render(value, record, index) ?? '';
          if (renderValue === false) value = 'false';
          else if (renderValue === true) value = 'true';
          else value = renderValue;
        }
        return toCell(value, isSubRow ? subRowStyle : {}, fontSize);
      })
    );
  });

  return {
    style: 'tableStyle',
    fontSize: fontSize,
    table: {
      headerRows: 1,
      body
    },
    layout: tableLayout(subRows, onMeasured)
  };
};

const getPdfDocDefinition = <T extends object>(
  logo: string | null,
  title: string,
  printObjects: IPrintObject<T>[],
  pdfSettings: IPdfSettings,
  tableFontSizes?: number[][]
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
        fontSize: PdfTableFontSize,
        color: 'black'
      }
    },
    defaultStyle: {
      fontSize: PdfTableFontSize
    }
  };
  const content: Content[] = [];
  printObjects.forEach((printObject, index: number) => {
    const headerContent: ContentColumns = {
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
    content.push(headerContent);
    printObject.tables.forEach((table, tableIndex) => {
      content.push(getTableContent(table, tableFontSizes?.[index]?.[tableIndex] ?? PdfTableFontSize));
    });
  });
  docDefinition.content = content;
  return docDefinition;
};

/** The width each table needs at the normal size of the text, measured by laying out the tables in pdfmake */
export const MeasurePdfTables = async <T extends object>(
  printObjects: IPrintObject<T>[]
): Promise<IPdfTableWidth[][]> => {
  const tableWidths: IPdfTableWidth[][] = printObjects.map(printObject =>
    printObject.tables.map(() => ({ textWidth: 0, fixedWidth: 0 }))
  );
  const content: Content[] = [];
  printObjects.forEach((printObject, index) =>
    printObject.tables.forEach((table, tableIndex) =>
      content.push(
        getTableContent(table, PdfTableFontSize, tableWidth => {
          tableWidths[index][tableIndex] = tableWidth;
        })
      )
    )
  );
  if (content.length === 0) return tableWidths;
  await pdfMake
    .createPdf({
      // Wide enough for every table, the widths are measured before the page matters
      pageSize: { width: 14400, height: 14400 },
      pageMargins: 0,
      content,
      styles: { tableStyle: {}, tableHeader: { bold: true, fontSize: PdfTableFontSize, color: 'black' } },
      defaultStyle: { fontSize: PdfTableFontSize }
    })
    .getBuffer();
  return tableWidths;
};

/** The settings and the size of the text of each table, asks when a table does not fit the width of the page */
export const FitPdfTables = async <T extends object>(
  printObjects: IPrintObject<T>[],
  pdfSettings: IPdfSettings,
  confirmFit?: PdfFitConfirm
): Promise<{ settings: IPdfSettings; fontSizes: number[][] } | undefined> => {
  const tableWidths = await MeasurePdfTables(printObjects);
  const fit = GetPdfFit(tableWidths.flat(), pdfSettings);
  let settings = pdfSettings;
  if (fit.tooWide > 0 && confirmFit) {
    const chosen = await confirmFit(fit);
    if (!chosen) return undefined;
    settings = chosen;
  }
  return {
    settings,
    fontSizes: tableWidths.map(widths => widths.map(tableWidth => PdfFitFontSize(tableWidth, settings)))
  };
};

export const getPdf = async <T extends object>(
  proxyurl: string,
  logoUrl: string,
  title: string,
  printObjects: IPrintObject<T>[],
  pdfSettings: IPdfSettings,
  confirmFit?: PdfFitConfirm,
  onProgress?: PdfProgress
): Promise<void> => {
  onProgress?.('measure', 0, 1);
  await showProgress();
  const fitted = await FitPdfTables(printObjects, pdfSettings, confirmFit);
  if (!fitted) return;
  onProgress?.('create', 0, 1, title);
  await showProgress();
  const logo = await getLogo(proxyurl, logoUrl);
  const docDefinition = getPdfDocDefinition(logo, title, printObjects, fitted.settings, fitted.fontSizes);

  await pdfMake.createPdf(docDefinition).download(`${title}.pdf`);
  onProgress?.('create', 1, 1, title);
};

export const getBase64 = (pdfDocument: pdfMake.TCreatedPdf): Promise<string> => {
  return pdfDocument.getBase64();
};

export const getZip = async <T extends object>(
  proxyurl: string,
  logoUrl: string,
  title: string,
  printObjects: IPrintObject<T>[],
  pdfSettings: IPdfSettings,
  confirmFit?: PdfFitConfirm,
  onProgress?: PdfProgress
): Promise<void> => {
  onProgress?.('measure', 0, 1);
  await showProgress();
  const fitted = await FitPdfTables(printObjects, pdfSettings, confirmFit);
  if (!fitted) return;
  onProgress?.('create', 0, printObjects.length, printObjects[0]?.header);
  await showProgress();
  const logo = await getLogo(proxyurl, logoUrl);
  const zip = new JSZip();

  for (let index = 0; index < printObjects.length; index++) {
    const printObject = printObjects[index];
    onProgress?.('create', index, printObjects.length, printObject.header);
    const docDefinition = getPdfDocDefinition(logo, title, [printObject], fitted.settings, [fitted.fontSizes[index]]);
    const data = await getBase64(pdfMake.createPdf(docDefinition));
    zip.file(`${printObject.header}.pdf`, data, { base64: true });
  }
  onProgress?.('create', printObjects.length, printObjects.length, title);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/zip' });
  const link = document.createElement('a');
  link.download = `${title}.zip`;
  link.href = URL.createObjectURL(blob);
  link.click();
};
