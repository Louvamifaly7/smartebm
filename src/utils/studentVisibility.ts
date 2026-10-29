import { User, StudentGroup, Course, ElementConstitutif, TimetableSession, GroupPost } from '../types';

/**
 * Returns the list of teachers who actively instruct courses, ECs, or timetable sessions for the given student group.
 */
export const getTeachersForStudent = (
  studentGroupId: string | undefined,
  courses: Course[],
  ecs: ElementConstitutif[],
  sessions: TimetableSession[],
  users: User[]
): User[] => {
  if (!studentGroupId) return [];
  const teacherIds = new Set<string>();

  // 1. From courses associated with student's group
  courses.forEach((c) => {
    if (c.groupIds?.includes(studentGroupId)) {
      c.teacherIds?.forEach((id) => teacherIds.add(id));
    }
  });

  // 2. From LMD ECs associated with student's group
  ecs.forEach((ec) => {
    if (ec.groupIds?.includes(studentGroupId)) {
      ec.teacherIds?.forEach((id) => teacherIds.add(id));
    }
  });

  // 3. From scheduled sessions for this group
  sessions.forEach((s) => {
    if (s.groupIds?.includes(studentGroupId) && s.teacherId) {
      teacherIds.add(s.teacherId);
    }
  });

  return users.filter((u) => u.role === 'TEACHER' && teacherIds.has(u.id));
};

/**
 * Returns the allowed groups visible to a user:
 * - If STUDENT: strictly only the student's enrolled group.
 * - Otherwise: all groups.
 */
export const getVisibleGroupsForUser = (user: User | null, groups: StudentGroup[]): StudentGroup[] => {
  if (!user) return [];
  if (user.role === 'STUDENT') {
    return groups.filter((g) => g.id === user.groupId);
  }
  return groups;
};

/**
 * Returns the allowed teachers visible to a user:
 * - If STUDENT: strictly only teachers who teach courses/ECs to the student's group.
 * - Otherwise: all teachers.
 */
export const getVisibleTeachersForUser = (
  user: User | null,
  courses: Course[],
  ecs: ElementConstitutif[],
  sessions: TimetableSession[],
  users: User[]
): User[] => {
  if (!user) return [];
  if (user.role === 'STUDENT') {
    return getTeachersForStudent(user.groupId, courses, ecs, sessions, users);
  }
  return users.filter((u) => u.role === 'TEACHER');
};

/**
 * Returns whether a student is allowed to view or interact with a specific group's wall or data.
 */
export const canStudentAccessGroup = (user: User | null, targetGroupId: string): boolean => {
  if (!user) return false;
  if (user.role !== 'STUDENT') return true;
  return user.groupId === targetGroupId;
};
