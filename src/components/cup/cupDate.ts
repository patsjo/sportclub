import dayjs from 'dayjs';
import 'dayjs/locale/sv';
import i18next from 'i18next';

/**
 * Formats a date with month and day names in the language of the user. The app keeps dayjs in
 * English globally (e.g. for the week start), so the cup pages set the language per date.
 */
export const formatCupDate = (date: string | dayjs.Dayjs, format: string) =>
  dayjs(date)
    .locale((i18next.language ?? '').toLowerCase().startsWith('sv') ? 'sv' : 'en')
    .format(format);
