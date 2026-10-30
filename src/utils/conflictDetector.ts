import { ConflictResult, Room, StudentGroup, TimetableSession, User } from '../types';

// Helper to convert "HH:mm" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// Check if two time intervals overlap
export function doIntervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

export function detectSessionConflicts(
  candidate: {
    id?: string;
    courseId: string;
    teacherId: string;
    groupIds: string[];
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
  },
  existingSessions: TimetableSession[],
  rooms: Room[],
  groups: StudentGroup[],
  teachers: User[]
): ConflictResult {
  const conflicts: ConflictResult['conflicts'] = [];

  // Exclude current session itself and cancelled sessions
  const activeSessionsOnDate = existingSessions.filter(
    (s) => s.id !== candidate.id && s.date === candidate.date && s.status !== 'CANCELLED'
  );

  const room = rooms.find((r) => r.id === candidate.roomId);
  const teacher = teachers.find((t) => t.id === candidate.teacherId);

  // 1. Check Room conflict (RG-08, RG-11, RG-12)
  for (const session of activeSessionsOnDate) {
    if (session.roomId === candidate.roomId) {
      if (doIntervalsOverlap(candidate.startTime, candidate.endTime, session.startTime, session.endTime)) {
        conflicts.push({
          type: 'ROOM',
          message: `La salle "${room?.name || candidate.roomId}" est déjà occupée de ${session.startTime} à ${session.endTime} par un autre cours.`,
          conflictingSession: session,
        });
      }
    }
  }

  // 2. Check Teacher conflict (skip if external speaker for a conference/custom event)
  if (candidate.teacherId && candidate.teacherId !== 'EXTERNAL_SPEAKER') {
    for (const session of activeSessionsOnDate) {
      if (session.teacherId === candidate.teacherId) {
        if (doIntervalsOverlap(candidate.startTime, candidate.endTime, session.startTime, session.endTime)) {
          conflicts.push({
            type: 'TEACHER',
            message: `L'enseignant(e) ${teacher?.name || 'sélectionné(e)'} a déjà une séance programmée de ${session.startTime} à ${session.endTime}.`,
            conflictingSession: session,
          });
        }
      }
    }
  }

  // 3. Check Group conflict
  for (const session of activeSessionsOnDate) {
    const overlappingGroup = candidate.groupIds.some((gId) => session.groupIds.includes(gId));
    if (overlappingGroup) {
      if (doIntervalsOverlap(candidate.startTime, candidate.endTime, session.startTime, session.endTime)) {
        const groupNames = candidate.groupIds
          .map((id) => groups.find((g) => g.id === id)?.code || id)
          .join(', ');
        conflicts.push({
          type: 'GROUP',
          message: `Le(s) groupe(s) ${groupNames} ont déjà une activité programmée de ${session.startTime} à ${session.endTime}.`,
          conflictingSession: session,
        });
      }
    }
  }

  // 4. Check Room Capacity
  if (room) {
    const totalHeadcount = candidate.groupIds.reduce((acc, gId) => {
      const g = groups.find((grp) => grp.id === gId);
      return acc + (g?.studentCount || 30);
    }, 0);

    if (totalHeadcount > room.capacity) {
      conflicts.push({
        type: 'CAPACITY',
        message: `Capacité insuffisante : La salle "${room.name}" accueille ${room.capacity} places max, or l'effectif total est de ${totalHeadcount} étudiants.`,
      });
    }
  }

  // Generate suggested alternatives if conflict found
  let suggestions: ConflictResult['suggestions'] = [];
  if (conflicts.length > 0) {
    suggestions = findAlternativeSlots(candidate, existingSessions, rooms, groups, teachers);
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    suggestions,
  };
}

// Assisted Scheduling: find slot suggestions without conflict
export function findAlternativeSlots(
  candidate: {
    id?: string;
    courseId: string;
    teacherId: string;
    groupIds: string[];
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
  },
  existingSessions: TimetableSession[],
  rooms: Room[],
  groups: StudentGroup[],
  teachers: User[]
): NonNullable<ConflictResult['suggestions']> {
  const suggestions: NonNullable<ConflictResult['suggestions']> = [];
  const durationMinutes = timeToMinutes(candidate.endTime) - timeToMinutes(candidate.startTime) || 120;

  const candidateDate = new Date(candidate.date);
  const standardSlots = [
    { start: '08:30', end: '10:30' },
    { start: '10:45', end: '12:45' },
    { start: '14:00', end: '16:00' },
    { start: '16:15', end: '18:15' },
  ];

  // Try standard slots on same day and +1, +2 days
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const checkDate = new Date(candidateDate);
    checkDate.setDate(candidateDate.getDate() + dayOffset);
    const dateStr = checkDate.toISOString().split('T')[0];

    // Filter available rooms with sufficient capacity
    const totalHeadcount = candidate.groupIds.reduce((acc, gId) => {
      const g = groups.find((grp) => grp.id === gId);
      return acc + (g?.studentCount || 30);
    }, 0);

    const eligibleRooms = rooms.filter((r) => r.capacity >= totalHeadcount && r.status === 'available');

    for (const slot of standardSlots) {
      if (dateStr === candidate.date && slot.start === candidate.startTime) {
        continue; // skip original requested slot
      }

      for (const targetRoom of eligibleRooms) {
        const testCandidate = {
          ...candidate,
          roomId: targetRoom.id,
          date: dateStr,
          startTime: slot.start,
          endTime: slot.end,
        };

        const activeSessions = existingSessions.filter(
          (s) => s.id !== candidate.id && s.date === dateStr && s.status !== 'CANCELLED'
        );

        const roomBusy = activeSessions.some(
          (s) => s.roomId === targetRoom.id && doIntervalsOverlap(slot.start, slot.end, s.startTime, s.endTime)
        );
        const teacherBusy =
          candidate.teacherId && candidate.teacherId !== 'EXTERNAL_SPEAKER'
            ? activeSessions.some(
                (s) => s.teacherId === candidate.teacherId && doIntervalsOverlap(slot.start, slot.end, s.startTime, s.endTime)
              )
            : false;
        const groupBusy = activeSessions.some(
          (s) => candidate.groupIds.some((gId) => s.groupIds.includes(gId)) && doIntervalsOverlap(slot.start, slot.end, s.startTime, s.endTime)
        );

        if (!roomBusy && !teacherBusy && !groupBusy) {
          suggestions.push({
            date: dateStr,
            startTime: slot.start,
            endTime: slot.end,
            roomId: targetRoom.id,
            roomName: targetRoom.name,
          });
          if (suggestions.length >= 3) return suggestions;
        }
      }
    }
  }

  return suggestions;
}
