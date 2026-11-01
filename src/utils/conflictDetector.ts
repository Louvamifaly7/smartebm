import { ConflictResult, Room, StudentGroup, TimetableSession, User } from '../types';
import { getAntananarivoDateStr } from './securityAndDateUtils';

// Helper to convert "HH:mm" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
  return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Check if two time intervals overlap
export function doIntervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

const FRENCH_DAYS_BY_INDEX = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function getSlotTimeBounds(slot: { slot?: string; startTime?: string; endTime?: string }): { startMin: number; endMin: number } {
  if (slot.startTime && slot.endTime) {
    return { startMin: timeToMinutes(slot.startTime), endMin: timeToMinutes(slot.endTime) };
  }
  const code = (slot.slot || '').toUpperCase();
  if (code === 'MATIN') return { startMin: 7 * 60, endMin: 12 * 60 + 30 };
  if (code === 'APRES_MIDI') return { startMin: 12 * 60 + 30, endMin: 18 * 60 + 30 };
  if (code === '07H_09H') return { startMin: 7 * 60, endMin: 9 * 60 };
  if (code === '09H_11H') return { startMin: 9 * 60, endMin: 11 * 60 };
  if (code === '11H_13H') return { startMin: 11 * 60, endMin: 13 * 60 };
  if (code === '13H_15H') return { startMin: 13 * 60, endMin: 15 * 60 };
  if (code === '15H_17H') return { startMin: 15 * 60, endMin: 17 * 60 };
  return { startMin: 7 * 60, endMin: 18 * 60 + 30 };
}

function getIsoWeekBounds(dateStr: string): { mondayStr: string; sundayStr: string } {
  const base = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    mondayStr: getAntananarivoDateStr(monday),
    sundayStr: getAntananarivoDateStr(sunday),
  };
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

  // P72: Validate chronological order of startTime and endTime
  const candidateStartMin = timeToMinutes(candidate.startTime);
  const candidateEndMin = timeToMinutes(candidate.endTime);
  if (candidateEndMin <= candidateStartMin) {
    return {
      hasConflict: true,
      conflicts: [
        {
          type: 'TIME',
          message: `Plage horaire invalide : l'heure de fin (${candidate.endTime}) doit être strictement postérieure à l'heure de début (${candidate.startTime}).`,
        },
      ],
      suggestions: [],
    };
  }

  const existingSelf = candidate.id ? existingSessions.find((s) => s.id === candidate.id) : undefined;
  const todayStr = getAntananarivoDateStr();

  // Exclude current session itself and cancelled sessions
  const activeSessionsOnDate = existingSessions.filter(
    (s) => s.id !== candidate.id && s.date === candidate.date && s.status !== 'CANCELLED'
  );

  const room = rooms.find((r) => r.id === candidate.roomId);
  const teacher = teachers.find((t) => t.id === candidate.teacherId);

  // P34 & P71: Check if room is in maintenance or unavailable.
  // Do NOT block legitimate edits/validations on an existing session already assigned to this room on a past date or without changing its room/schedule.
  if (room && room.status && room.status !== 'available') {
    const isSameRoomAsBefore = existingSelf && existingSelf.roomId === candidate.roomId;
    const isPastSessionEdit = existingSelf && candidate.date < todayStr && isSameRoomAsBefore;
    const isUnchangedScheduleInOccupiedRoom =
      isSameRoomAsBefore &&
      room.status === 'occupied' &&
      existingSelf.date === candidate.date &&
      existingSelf.startTime === candidate.startTime &&
      existingSelf.endTime === candidate.endTime;

    if (!isPastSessionEdit && !isUnchangedScheduleInOccupiedRoom) {
      const statusLabel = room.status === 'maintenance' ? 'en maintenance technique' : 'indisponible / réservée';
      conflicts.push({
        type: 'ROOM',
        message: `La salle "${room.name}" (${room.code}) est actuellement ${statusLabel} et ne peut pas recevoir de nouvelle séance.`,
      });
    }
  }

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

  // 2. Check Teacher conflict, availabilities, and weeklyMaxHours (skip if external speaker)
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

    if (teacher) {
      // 2a. Check Teacher Availabilities
      if (Array.isArray(teacher.availabilities) && teacher.availabilities.length > 0 && candidate.date) {
        const dayIndex = new Date(`${candidate.date}T12:00:00`).getDay();
        const frenchDay = FRENCH_DAYS_BY_INDEX[dayIndex] || '';
        const daySlots = teacher.availabilities.filter(
          (a) => a.day.toUpperCase() === frenchDay.toUpperCase()
        );

        // Explicit unavailability overlapping the candidate slot
        const unavailableOverlap = daySlots.find((slot) => {
          if (slot.available !== false) return false;
          const { startMin, endMin } = getSlotTimeBounds(slot);
          return Math.max(candidateStartMin, startMin) < Math.min(candidateEndMin, endMin);
        });

        if (unavailableOverlap) {
          conflicts.push({
            type: 'AVAILABILITY',
            message: `L'enseignant(e) ${teacher.name} est déclaré(e) indisponible le ${frenchDay} sur ce créneau (${candidate.startTime}–${candidate.endTime}).`,
          });
        } else {
          // If positive availability slots exist for this teacher, verify the candidate falls within available slots on that day
          const allAvailableSlots = teacher.availabilities.filter((a) => a.available !== false);
          if (allAvailableSlots.length > 0) {
            const availableDaySlots = daySlots.filter((a) => a.available !== false);
            const isCovered = availableDaySlots.some((slot) => {
              const { startMin, endMin } = getSlotTimeBounds(slot);
              return candidateStartMin >= startMin && candidateEndMin <= endMin;
            });
            if (!isCovered && availableDaySlots.length === 0) {
              conflicts.push({
                type: 'AVAILABILITY',
                message: `L'enseignant(e) ${teacher.name} n'a aucun créneau de disponibilité déclaré le ${frenchDay}.`,
              });
            }
          }
        }
      }

      // 2b. Check Teacher weeklyMaxHours quota
      if (typeof teacher.weeklyMaxHours === 'number' && teacher.weeklyMaxHours > 0 && candidate.date) {
        const { mondayStr, sundayStr } = getIsoWeekBounds(candidate.date);
        const existingWeekHours = existingSessions
          .filter(
            (s) =>
              s.id !== candidate.id &&
              s.teacherId === teacher.id &&
              s.status !== 'CANCELLED' &&
              s.date >= mondayStr &&
              s.date <= sundayStr
          )
          .reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
        const candidateDurationHours = (candidateEndMin - candidateStartMin) / 60;
        const totalWeekHours = Number((existingWeekHours + candidateDurationHours).toFixed(2));
        if (totalWeekHours > teacher.weeklyMaxHours) {
          conflicts.push({
            type: 'QUOTA',
            message: `Dépassement du quota hebdomadaire pour ${teacher.name} : ${totalWeekHours}h programmées sur la semaine (maximum autorisé : ${teacher.weeklyMaxHours}h).`,
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

  // 4. Check Room Capacity (P74: use actual studentCount ?? 0, never invent 30 when 0)
  if (room) {
    const totalHeadcount = candidate.groupIds.reduce((acc, gId) => {
      const g = groups.find((grp) => grp.id === gId);
      return acc + (g?.studentCount ?? 0);
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

// Assisted Scheduling: find slot suggestions without conflict (P73, P74, P75)
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
  _teachers: User[]
): NonNullable<ConflictResult['suggestions']> {
  const suggestions: NonNullable<ConflictResult['suggestions']> = [];
  const rawDiff = timeToMinutes(candidate.endTime) - timeToMinutes(candidate.startTime);
  const durationMinutes = rawDiff > 0 ? rawDiff : 120;

  const candidateDate = candidate.date ? new Date(`${candidate.date}T12:00:00`) : new Date();
  const candidateStarts = ['07:30', '08:30', '10:30', '13:30', '14:00', '15:30'];

  const totalHeadcount = candidate.groupIds.reduce((acc, gId) => {
    const g = groups.find((grp) => grp.id === gId);
    return acc + (g?.studentCount ?? 0);
  }, 0);

  const eligibleRooms = rooms.filter((r) => r.capacity >= totalHeadcount && r.status === 'available');

  // Try slots on same day and next 4 days (skipping Sundays)
  for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
    const checkDate = new Date(candidateDate);
    checkDate.setDate(candidateDate.getDate() + dayOffset);
    if (checkDate.getDay() === 0) continue; // P73: Skip Sunday

    const dateStr = getAntananarivoDateStr(checkDate);

    for (const slotStart of candidateStarts) {
      const startMin = timeToMinutes(slotStart);
      const endMin = startMin + durationMinutes;
      if (endMin > 18 * 60 + 30) continue;
      const slotEnd = minutesToTime(endMin);

      if (dateStr === candidate.date && slotStart === candidate.startTime && slotEnd === candidate.endTime) {
        continue;
      }

      for (const targetRoom of eligibleRooms) {
        const activeSessions = existingSessions.filter(
          (s) => s.id !== candidate.id && s.date === dateStr && s.status !== 'CANCELLED'
        );

        const roomBusy = activeSessions.some(
          (s) => s.roomId === targetRoom.id && doIntervalsOverlap(slotStart, slotEnd, s.startTime, s.endTime)
        );
        const teacherBusy =
          candidate.teacherId && candidate.teacherId !== 'EXTERNAL_SPEAKER'
            ? activeSessions.some(
                (s) => s.teacherId === candidate.teacherId && doIntervalsOverlap(slotStart, slotEnd, s.startTime, s.endTime)
              )
            : false;
        const groupBusy = activeSessions.some(
          (s) =>
            candidate.groupIds.some((gId) => s.groupIds.includes(gId)) &&
            doIntervalsOverlap(slotStart, slotEnd, s.startTime, s.endTime)
        );

        if (!roomBusy && !teacherBusy && !groupBusy) {
          suggestions.push({
            date: dateStr,
            startTime: slotStart,
            endTime: slotEnd,
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
