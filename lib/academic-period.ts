import { dateInMoscow, parseMoscowDate, type StatisticsRange } from '../data/statistics-utils';
export function academicYear(date = new Date()) {
  const [year, month] = dateInMoscow(date).split('-').map(Number);
  return month >= 8 ? year : year - 1;
}
export function parseAcademicPeriod(value?: string) {
  const period = value || 'all';
  if (period !== 'all' && (!/^\d{4}$/.test(period) || Number(period) < 2000 || Number(period) > academicYear())) throw new RangeError('Выберите учебный год или всю историю');
  return period;
}
export function academicRange(period: string, earliest: Date, now = new Date()): StatisticsRange {
  parseAcademicPeriod(period);
  const from = period === 'all' ? dateInMoscow(earliest) : `${period}-08-01`;
  const start = parseMoscowDate(from);
  const end = period === 'all' ? new Date(parseMoscowDate(dateInMoscow(now)).valueOf() + 86400000) : parseMoscowDate(`${Number(period) + 1}-08-01`);
  return { from, to: dateInMoscow(new Date(end.valueOf() - 86400000)), start, end };
}
