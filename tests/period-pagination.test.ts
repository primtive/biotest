import test from 'node:test';
import assert from 'node:assert/strict';
import { academicYear, academicRange, parseAcademicPeriod } from '../lib/academic-period';
import { parsePagination, pageInfo } from '../lib/pagination';
test('academic years change on August 1 at Moscow midnight', () => {
  assert.equal(parseAcademicPeriod(), 'all');
  assert.equal(academicYear(new Date('2026-07-31T20:59:59Z')), 2025);
  assert.equal(academicYear(new Date('2026-07-31T21:00:00Z')), 2026);
  const range = academicRange('2025', new Date('2024-01-01T00:00:00Z'));
  assert.equal(range.start.toISOString(), '2025-07-31T21:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-07-31T21:00:00.000Z');
  assert.equal(range.to, '2026-07-31');
  assert.throws(() => parseAcademicPeriod('2025-08-01'));
  assert.throws(() => parseAcademicPeriod('1999'));
});
test('full history includes the first day and excludes the next Moscow midnight', () => {
  const range = academicRange('all', new Date('2024-02-01T22:00:00Z'), new Date('2026-10-20T03:00:00Z'));
  assert.equal(range.from, '2024-02-02');
  assert.equal(range.end.toISOString(), '2026-10-20T21:00:00.000Z');
});
test('pagination bounds sizes and clamps pages after filtering', () => {
  assert.deepEqual(parsePagination({ page: '3', pageSize: '50' }), { page: 3, pageSize: 50, skip: 100 });
  for (const query of [{ page: '-1' }, { page: '1.5' }, { pageSize: '10000' }, { page: 'Infinity' }]) assert.throws(() => parsePagination(query));
  assert.deepEqual(pageInfo(0, 100, 20), { total: 0, totalPages: 1, page: 1, pageSize: 20 });
  assert.equal(pageInfo(41, 9, 20).page, 3);
});
