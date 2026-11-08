import { describe, expect, it } from 'vitest';
import {
  FitPdfTables,
  GetPdfFit,
  IPdfFit,
  IPdfSettings,
  MeasurePdfTables,
  PdfAvailableWidth,
  PdfFitFontSize,
  PdfTableFontSize
} from './pdf';

const a4: IPdfSettings = { pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [15, 10, 10, 10] };

interface IRow {
  name: string;
  time: string;
  total?: boolean;
}

const printObject = (columns: number, title = 'Löphastighetsranking') => ({
  header: 'Test',
  inputs: [],
  tables: [
    {
      columns: [...Array(columns)].map((_, index) => ({
        key: index === 0 ? 'name' : 'time',
        title: `${title}${index}`,
        selected: true
      })),
      dataSource: [
        { name: 'Vilselöpet, lång + JVM-test, lång', time: '1:05:31' },
        { name: 'Totalt', time: '2:10:00', total: true }
      ] as IRow[],
      isSubRow: (record: IRow) => !!record.total
    }
  ]
});

describe('pdf width', () => {
  it('knows the width between the margins', () => {
    expect(PdfAvailableWidth(a4)).toBeCloseTo(595.28 - 25);
    expect(PdfAvailableWidth({ ...a4, pageOrientation: 'landscape' })).toBeCloseTo(841.89 - 25);
    expect(PdfAvailableWidth({ ...a4, pageSize: 'A3' })).toBeCloseTo(841.89 - 25);
  });

  it('makes the text smaller only when the table is too wide', () => {
    expect(PdfFitFontSize({ textWidth: 400, fixedWidth: 60 }, a4)).toBe(PdfTableFontSize);
    // 570 - 60 = 510 for the text that needs 1020 at 10 pt
    expect(PdfFitFontSize({ textWidth: 1020, fixedWidth: 60 }, a4)).toBeCloseTo(5, 1);
  });

  it('tells the alternatives and their text', () => {
    // Landscape fits, landscape with reduced margins is not needed. A3 fits as it is.
    const fit = GetPdfFit([{ textWidth: 700, fixedWidth: 60 }], a4);
    expect(fit.tooWide).toBe(1);
    expect(fit.options.map(option => option.key)).toEqual(['current', 'ReducedMargins', 'Landscape', 'A3']);
    const [current, margins, landscape, a3] = fit.options;
    expect(current.fontSize).toBeLessThan(margins.fontSize);
    expect(landscape.fontSize).toBe(PdfTableFontSize);
    expect(a3.fontSize).toBe(PdfTableFontSize);
    expect(margins.settings.pageMargins).toEqual([5, 10, 5, 10]);
    // Too wide for all but A3 landscape
    const wide = GetPdfFit([{ textWidth: 1100, fixedWidth: 60 }], a4);
    expect(wide.options.map(option => option.key)).toEqual([
      'current',
      'ReducedMargins',
      'Landscape',
      'LandscapeReducedMargins',
      'A3',
      'A3ReducedMargins',
      'A3Landscape'
    ]);
    expect(wide.options.find(option => option.key === 'A3Landscape')?.settings).toMatchObject({
      pageSize: 'A3',
      pageOrientation: 'landscape',
      pageMargins: [15, 10, 10, 10]
    });
    expect(
      GetPdfFit([{ textWidth: 700, fixedWidth: 60 }], {
        ...a4,
        pageSize: 'A3',
        pageOrientation: 'landscape'
      }).options.map(option => option.key)
    ).toEqual(['current']);
  });

  it('measures the tables by laying them out in pdfmake', async () => {
    const [[narrow]] = await MeasurePdfTables([printObject(3)]);
    const [[wide]] = await MeasurePdfTables([printObject(12)]);
    expect(narrow.textWidth).toBeGreaterThan(0);
    // The paddings between the columns, 3 + 3 except outside the first and the last
    expect(narrow.fixedWidth).toBeCloseTo(12);
    expect(wide.fixedWidth).toBeCloseTo(66);
    expect(wide.textWidth).toBeGreaterThan(3 * narrow.textWidth);
    expect(PdfFitFontSize(narrow, a4)).toBe(PdfTableFontSize);
    expect(PdfFitFontSize(wide, a4)).toBeLessThan(PdfTableFontSize);
  });

  it('asks once for all the print objects, as when all are printed', async () => {
    const asked: IPdfFit[] = [];
    const fitted = await FitPdfTables([printObject(3), printObject(12), printObject(12)], a4, fit => {
      asked.push(fit);
      return Promise.resolve(fit.options.find(option => option.key === 'Landscape')?.settings);
    });
    expect(asked).toHaveLength(1);
    expect(asked[0]).toMatchObject({ tooWide: 2, total: 3 });
    expect(fitted?.settings.pageOrientation).toBe('landscape');
    expect(fitted?.fontSizes.map(sizes => sizes[0] === PdfTableFontSize)).toEqual([true, false, false]);
    // Cancelled, no PDF
    expect(await FitPdfTables([printObject(12)], a4, () => Promise.resolve(undefined))).toBeUndefined();
    // Fits, not asked
    expect(await FitPdfTables([printObject(3)], a4, () => Promise.reject(new Error('asked')))).toBeDefined();
  });
});
