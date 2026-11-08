import { IPrintTableColumn } from './pdf';
import { IViewResult, IViewTeamResult } from './responseInterfaces';
import { FormatTime } from './resultHelper';

/** The row of a total, shown under the result it belongs to */
export interface ITotalRowProps {
  isTotalRow?: boolean;
  /** The result has a total row under it */
  hasTotalRow?: boolean;
  /** The columns that show a total, the others are empty */
  totalKeys?: string[];
  /** The time of a relay team, behind the winning team */
  totalTimeText?: string | null;
}

export type IViewResultRow = IViewResult & ITotalRowProps;
export type IViewTeamResultRow = IViewTeamResult & ITotalRowProps;

const isTeamResult = (result: IViewResult | IViewTeamResult): result is IViewTeamResult => 'teamResultId' in result;

/** The total of the result: of an event of several days, or of the relay team */
export const TotalRow = <T extends IViewResult | IViewTeamResult>(result: T): (T & ITotalRowProps) | undefined => {
  if (isTeamResult(result)) {
    if (result.totalPosition == null && !result.teamFailedReason && !result.totalTimeBehind) return undefined;
    const timeBehind = FormatTime(result.totalTimeBehind);
    return {
      ...result,
      isTotalRow: true,
      totalKeys: ['competitorTime', 'position', 'nofStartsInClass'],
      failedReason: result.teamFailedReason ?? null,
      competitorTime: null,
      totalTimeText: !result.teamFailedReason && timeBehind && result.totalPosition !== 1 ? `+${timeBehind}` : null,
      position: result.totalPosition ?? null,
      nofStartsInClass: result.totalNofStartsInClass ?? null
    } as T & ITotalRowProps;
  }
  const multiDay = result.resultMultiDay;
  // An event of one day has no total
  if (!multiDay || !(multiDay.totalStages > 1)) return undefined;
  if (multiDay.totalTime == null && multiDay.totalPosition == null && multiDay.totalFailedReason == null)
    return undefined;
  return {
    ...result,
    isTotalRow: true,
    totalKeys: ['lengthInMeter', 'competitorTime', 'winnerTime', 'secondTime', 'position', 'nofStartsInClass'],
    lengthInMeter: multiDay.totalLengthInMeter ?? null,
    failedReason: multiDay.totalFailedReason ?? null,
    competitorTime: multiDay.totalTime ?? null,
    winnerTime: multiDay.totalWinnerTime ?? null,
    secondTime: multiDay.totalSecondTime ?? null,
    position: multiDay.totalPosition ?? null,
    nofStartsInClass: multiDay.totalNofStartsInClass ?? null
  } as T & ITotalRowProps;
};

/** The results, each followed by the row of its total when it has one */
export const WithTotalRows = <T extends IViewResult | IViewTeamResult>(results: T[]): (T & ITotalRowProps)[] =>
  results.flatMap(result => {
    const total = TotalRow(result);
    return total ? [{ ...result, hasTotalRow: true }, total] : [result];
  });

export const IsTotalRow = (record: object): boolean => !!(record as ITotalRowProps).isTotalRow;

/** The key of a row, the row of a total gets its own */
export const TotalRowKey = (record: IViewResult | IViewTeamResult): string =>
  `${isTeamResult(record) ? `t${record.teamResultId}` : record.resultId}${IsTotalRow(record) ? '-total' : ''}`;

export const TotalRowClassName = (record: object): string =>
  IsTotalRow(record) ? 'table-row-sub' : (record as ITotalRowProps).hasTotalRow ? 'table-row-has-sub' : '';

/**
 * The columns showing the row of a total: the columns of a total show its value, the first column says "Total"
 * (unless it shows a value of the total) and the others are empty.
 */
export const WithTotalColumns = <T extends object>(
  columns: IPrintTableColumn<T>[],
  /** "Total", as shown in the table or the PDF */
  totalText: unknown
): IPrintTableColumn<T>[] =>
  columns.map((col, index) => ({
    ...col,
    render: (value: unknown, record: T, rowIndex: number) => {
      const row = record as ITotalRowProps;
      if (!row.isTotalRow) return col.render ? col.render(value, record, rowIndex) : value;
      if (row.totalKeys?.includes(col.key)) {
        const text =
          col.key === 'competitorTime' && row.totalTimeText
            ? row.totalTimeText
            : col.render
              ? col.render(value, record, rowIndex)
              : value;
        if (index > 0 || (text != null && text !== '')) return text;
      }
      return index === 0 ? totalText : null;
    }
  })) as IPrintTableColumn<T>[];
