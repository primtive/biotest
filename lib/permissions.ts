import type { Prisma } from '@prisma/client';

type Identity = { admin: boolean; teacher?: boolean | null; teacherGroups?: string[] };
type Student = { admin: boolean; teacher?: boolean | null; group: string; isArchive: boolean };

export const isTeacher = (user: Identity) => !user.admin && user.teacher === true;
export const canSupervise = (user: Identity) => user.admin || isTeacher(user);
export const assignedGroups = (user: Identity) => [...new Set((user.teacherGroups || []).filter(group => group.trim()))].sort();
export function canViewStudent(actor: Identity, student: Student) {
  return actor.admin || (isTeacher(actor) && !student.admin && !student.teacher && !student.isArchive && assignedGroups(actor).includes(student.group));
}

// Missing teacher fields belong to existing student accounts.
export function studentWhere(actor: Identity): Prisma.UserWhereInput {
  return actor.admin ? {} : {
    admin: false, isArchive: false,
    OR: [{ teacher: false }, { teacher: null }, { teacher: { isSet: false } }],
    group: { in: isTeacher(actor) ? assignedGroups(actor) : [] },
  };
}

export const studentMatch = (groups: string[]) => ({ admin: false, teacher: { $ne: true }, isArchive: false, group: { $in: groups } });
