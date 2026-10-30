import test from 'node:test';
import assert from 'node:assert/strict';
import { assignedGroups, canSupervise, canViewStudent, isTeacher } from '../lib/permissions';

test('teachers see only non-archived students in exact assigned groups', () => {
  const teacher = { admin: false, teacher: true, teacherGroups: ['10А', '11Б', '10А', ''] };
  const student = { admin: false, group: '10А', isArchive: false };
  assert.deepEqual(assignedGroups(teacher), ['10А', '11Б']);
  assert.equal(canSupervise(teacher), true);
  assert.equal(canViewStudent(teacher, student), true);
  for (const change of [{ group: '10' }, { group: '10а' }, { group: '' }, { admin: true }, { teacher: true }, { isArchive: true }]) {
    assert.equal(canViewStudent(teacher, { ...student, ...change }), false);
  }
  assert.equal(canViewStudent({ ...teacher, teacherGroups: [] }, student), false);
  assert.equal(canViewStudent({ ...teacher, teacher: false }, student), false);
});

test('legacy students keep student access and administrators keep full access', () => {
  assert.equal(isTeacher({ admin: false }), false);
  assert.equal(isTeacher({ admin: false, teacher: null }), false);
  assert.equal(canSupervise({ admin: false, teacherGroups: ['10А'] }), false);
  assert.equal(isTeacher({ admin: true, teacher: true }), false);
  assert.equal(canViewStudent({ admin: true }, { admin: true, group: '', isArchive: true }), true);
});
