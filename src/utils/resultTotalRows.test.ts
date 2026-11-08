import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { describe, expect, it } from 'vitest';
import { IPrintTableColumn } from './pdf';
import { IViewResult, IViewTeamResult } from './responseInterfaces';
import { TotalRowClassName, TotalRowKey, WithTotalColumns, WithTotalRows } from './resultTotalRows';

// Extended by antd in the app
dayjs.extend(customParseFormat);

const result = (values: Partial<IViewResult>): IViewResult => ({
  resultId: 1,
  competitorId: 5,
  className: 'H50',
  feeToClub: 0,
  serviceFeeToClub: 0,
  ...values
});

const teamResult = (values: Partial<IViewTeamResult>): IViewTeamResult => ({
  teamResultId: 1,
  competitorId: 5,
  className: 'H135',
  stage: 2,
  totalStages: 3,
  feeToClub: 0,
  serviceFeeToClub: 0,
  ...values
});

const render = <T extends object>(columns: IPrintTableColumn<T>[], record: T) =>
  columns.map((col, index) => {
    const value = record[col.key as keyof T];
    return col.render ? col.render(value, record, index) : value;
  });

describe('total rows', () => {
  const multiDay = {
    multiDayResultId: 1,
    stage: 2,
    totalStages: 2,
    totalLengthInMeter: 13325,
    totalTime: '01:58:46',
    totalWinnerTime: '01:50:00',
    totalPosition: 3,
    totalNofStartsInClass: 23
  };

  it('adds the total of an event of several days under the result', () => {
    const rows = WithTotalRows([
      result({ resultId: 1, resultMultiDay: multiDay, position: 4 }),
      result({ resultId: 2, resultMultiDay: null }),
      result({ resultId: 3, resultMultiDay: { ...multiDay, stage: 1, totalStages: 1 } })
    ]);
    expect(rows.map(TotalRowKey)).toEqual(['1', '1-total', '2', '3']);
    expect(rows.map(TotalRowClassName)).toEqual(['table-row-has-sub', 'table-row-sub', '', '']);
    expect(rows[1]).toMatchObject({ position: 3, nofStartsInClass: 23, lengthInMeter: 13325 });
  });

  it('says Total in the first column unless it shows a total', () => {
    const columns: IPrintTableColumn<IViewResult>[] = [
      { key: 'raceDate', title: 'Date', selected: true },
      { key: 'className', title: 'Class', selected: true },
      { key: 'competitorTime', title: 'Time', selected: true, render: (value: string) => value },
      { key: 'position', title: 'Position', selected: true }
    ];
    const [main, total] = WithTotalRows([
      result({ raceDate: '2026-10-25', resultMultiDay: multiDay, competitorTime: '01:10:31' } as Partial<IViewResult>)
    ]);
    const totalColumns = WithTotalColumns(columns, 'Totalt');
    expect(render(totalColumns, main)).toEqual(['2026-10-25', 'H50', '01:10:31', undefined]);
    expect(render(totalColumns, total)).toEqual(['Totalt', null, '01:58:46', 3]);
    const startsWithPosition = WithTotalColumns([columns[3], columns[0]], 'Totalt');
    expect(render(startsWithPosition, total)).toEqual([3, null]);
  });

  it('adds the result of the relay team', () => {
    const [, total] = WithTotalRows([
      teamResult({ totalPosition: 2, totalNofStartsInClass: 6, totalTimeBehind: '00:01:20' })
    ]);
    const columns = WithTotalColumns<IViewTeamResult>(
      [
        { key: 'competitorTime', title: 'Time', selected: true },
        { key: 'position', title: 'Position', selected: true }
      ],
      'Totalt'
    );
    expect(render(columns, total)[1]).toBe(2);
    expect(String(render(columns, total)[0])).toMatch(/^\+1:20/);
    expect(TotalRowKey(total)).toBe('t1-total');
  });
});
