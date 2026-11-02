import { ConflictResult, Course, Filiere, Room, StudentGroup, TimetableSession, User } from '../types';
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

// Jours fériés officiels & périodes de fermeture universitaire (Madagascar / EBM Institute)
export const OFFICIAL_UNIVERSITY_HOLIDAYS: {
  monthDay?: string; // MM-DD (récurrent chaque année)
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  label: string;
}[] = [
  { monthDay: '01-01', label: 'Jour de l’An (Férié)' },
  { monthDay: '03-29', label: 'Commémoration du 29 Mars 1947 (Férié)' },
  { monthDay: '05-01', label: 'Fête du Travail (Férié)' },
  { monthDay: '06-26', label: 'Fête Nationale de l’Indépendance (Férié)' },
  { monthDay: '08-15', label: 'Assomption (Férié)' },
  { monthDay: '12-25', label: 'Noël (Férié)' },
  { startDate: '2026-12-21', endDate: '2027-01-03', label: 'Vacances universitaires de fin d’année' },
];

export function checkAcademicHolidayOrVacation(dateStr: string): string | null {
  if (!dateStr || dateStr.length < 10) return null;
  const mmDd = dateStr.slice(5, 10);
  for (const h of OFFICIAL_UNIVERSITY_HOLIDAYS) {
    if (h.monthDay && h.monthDay === mmDd) {
      return h.label;
    }
    if (h.startDate && h.endDate && dateStr >= h.startDate && dateStr <= h.endDate) {
      return h.label;
    }
  }
  return null;
}

export function isRoomInMaintenanceOnDate(room: Room, dateStr: string): { blocked: boolean; reason?: string } {
  if (!room) return { blocked: false };

  // 1. Période de maintenance avec dates de début et de fin
  if (room.maintenanceStartDate && room.maintenanceEndDate && dateStr) {
    if (dateStr >= room.maintenanceStartDate && dateStr <= room.maintenanceEndDate) {
      return {
        blocked: true,
        reason: `en maintenance programmée du ${room.maintenanceStartDate} au ${room.maintenanceEndDate}${
          room.maintenanceReason ? ` (${room.maintenanceReason})` : ''
        }`,
      };
    }
    // Si la salle a une période de maintenance définie et que la date est en dehors de cette plage, elle est réservable
    if (room.status === 'maintenance') {
      return { blocked: false };
    }
  }

  // 2. Blocage jusqu'à une date limite (blockedUntil)
  if (room.blockedUntil && dateStr) {
    const blockedLimitDate = room.blockedUntil.slice(0, 10);
    if (dateStr <= blockedLimitDate && room.status !== 'available') {
      return {
        blocked: true,
        reason: `indisponible jusqu'au ${blockedLimitDate}${
          room.maintenanceReason ? ` (${room.maintenanceReason})` : ''
        }`,
      };
    }
  }

  // 3. Statut global maintenance / indisponible sans plage de dates restreinte
  if (room.status && room.status !== 'available') {
    const statusLabel =
      room.status === 'maintenance'
        ? `en maintenance technique${room.maintenanceReason ? ` (${room.maintenanceReason})` : ''}`
        : 'indisponible / réservée';
    return { blocked: true, reason: statusLabel };
  }

  return { blocked: false };
}

function getSlotTimeBounds(slot: { slot?: string; startTime?: string; endTime?: string }): { startMin: number; endMin: number } {
  if (slot.startTime && slot.endTime) {
    return { startMin: timeToMinutes(slot.startTime), endMin: timeToMinutes(slot.endTime) };
  }
  const code = (slot.slot || '').toUpperCase().trim();
  if (code === 'MATIN') return { startMin: 7 * 60, endMin: 12 * 60 + 30 };
  if (code === 'APRES_MIDI' || code === 'APRÈS-MIDI') return { startMin: 12 * 60 + 30, endMin: 18 * 60 + 30 };
  if (code === 'JOURNEE' || code === 'JOURNÉE' || code === 'FULL_DAY') return { startMin: 7 * 60, endMin: 18 * 60 + 30 };
  if (code === '07H_09H') return { startMin: 7 * 60, endMin: 9 * 60 };
  if (code === '09H_11H') return { startMin: 9 * 60, endMin: 11 * 60 };
  if (code === '11H_13H') return { startMin: 11 * 60, endMin: 13 * 60 };
  if (code === '13H_15H') return { startMin: 13 * 60, endMin: 15 * 60 };
  if (code === '15H_17H') return { startMin: 15 * 60, endMin: 17 * 60 };
  // Parse dynamic pattern like "08:00-12:00" or "08H_12H"
  const rangeMatch = code.match(/^(\d{1,2})(?:H|:(\d{2}))[_-](\d{1,2})(?:H|:(\d{2}))$/);
  if (rangeMatch) {
    const sH = Number(rangeMatch[1]);
    const sM = Number(rangeMatch[2] || 0);
    const eH = Number(rangeMatch[3]);
    const eM = Number(rangeMatch[4] || 0);
    return { startMin: sH * 60 + sM, endMin: eH * 60 + eM };
  }
  return { startMin: 7 * 60, endMin: 18 * 60 + 30 };
}

/**
 * Fusionne les intervalles de disponibilité adjacents ou chevauchants d'une même journée
 * afin qu'un enseignant disponible sur 07h-09h ET 09h-11h puisse assurer un cours de 08h-10h,
 * tout en exigeant que la séance soit 100% incluse dans l'intervalle fusionné.
 */
function mergeTimeIntervals(intervals: { startMin: number; endMin: number }[]): { startMin: number; endMin: number }[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals]
    .filter((i) => i.endMin > i.startMin)
    .sort((a, b) => a.startMin - b.startMin);
  if (sorted.length === 0) return [];

  const merged: { startMin: number; endMin: number }[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, current.endMin);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
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

export interface ConflictDetectionOptions {
  dayStartTime?: string; // default '06:30'
  dayEndTime?: string;   // default '20:00'
  scheduleSettings?: {
    dayStartTime?: string;
    dayEndTime?: string;
    slotIntervalMinutes?: number;
  };
  enforceHolidays?: boolean;
  includeSuggestions?: boolean;
  courses?: Course[];
  filieres?: Filiere[];
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
  teachers: User[],
  options: ConflictDetectionOptions = {}
): ConflictResult {
  const conflicts: ConflictResult['conflicts'] = [];
  const includeSuggestions = options.includeSuggestions !== false;

  // 0. Validate chronological order of startTime and endTime
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

  // 0b. Check institution opening hours if configured
  const effectiveDayStart = options.dayStartTime || options.scheduleSettings?.dayStartTime || '06:30';
  const effectiveDayEnd = options.dayEndTime || options.scheduleSettings?.dayEndTime || '20:00';
  const minAllowedMin = timeToMinutes(effectiveDayStart);
  const maxAllowedMin = timeToMinutes(effectiveDayEnd);
  if (candidateStartMin < minAllowedMin || candidateEndMin > maxAllowedMin) {
    conflicts.push({
      type: 'TIME',
      message: `Horaire hors amplitude d'ouverture de l'établissement (${effectiveDayStart} – ${effectiveDayEnd}).`,
    });
  }

  const existingSelf = candidate.id ? existingSessions.find((s) => s.id === candidate.id) : undefined;
  const todayStr = getAntananarivoDateStr();

  // 0c. Check academic holidays & university vacations (unless validating/editing an existing past session on the same date)
  if (options.enforceHolidays !== false && candidate.date) {
    const isUnchangedExistingDate = existingSelf && existingSelf.date === candidate.date;
    if (!isUnchangedExistingDate) {
      const holidayLabel = checkAcademicHolidayOrVacation(candidate.date);
      if (holidayLabel) {
        conflicts.push({
          type: 'HOLIDAY',
          message: `Planification impossible le ${candidate.date} : ${holidayLabel}.`,
        });
      }
    }
  }

  // Exclude current session itself and cancelled sessions
  const activeSessionsOnDate = existingSessions.filter(
    (s) => s.id !== candidate.id && s.date === candidate.date && s.status !== 'CANCELLED'
  );

  const room = rooms.find((r) => r.id === candidate.roomId);
  const teacher = teachers.find((t) => t.id === candidate.teacherId);

  // 1. Check Room status & maintenance periods (supports maintenanceStartDate / maintenanceEndDate)
  if (room) {
    const isSameRoomAsBefore = existingSelf && existingSelf.roomId === candidate.roomId;
    const isPastSessionEdit = existingSelf && candidate.date < todayStr && isSameRoomAsBefore;
    const isUnchangedScheduleInOccupiedRoom =
      isSameRoomAsBefore &&
      room.status === 'occupied' &&
      existingSelf.date === candidate.date &&
      existingSelf.startTime === candidate.startTime &&
      existingSelf.endTime === candidate.endTime;

    if (!isPastSessionEdit && !isUnchangedScheduleInOccupiedRoom) {
      const maintCheck = isRoomInMaintenanceOnDate(room, candidate.date);
      if (maintCheck.blocked) {
        conflicts.push({
          type: 'ROOM',
          message: `La salle "${room.name}" (${room.code}) est ${maintCheck.reason} et ne peut pas recevoir de séance le ${candidate.date}.`,
        });
      }
    }
  }

  // 1b. Check Room schedule overlap (RG-08, RG-11, RG-12)
  for (const session of activeSessionsOnDate) {
    if (session.roomId === candidate.roomId) {
      if (doIntervalsOverlap(candidate.startTime, candidate.endTime, session.startTime, session.endTime)) {
        const confCourse = options.courses?.find((c) => c.id === session.courseId);
        const confFiliere = options.filieres?.find((f) => f.id === confCourse?.filiereId);
        const confTeacher = teachers.find((t) => t.id === session.teacherId);
        const confGroupNames = session.groupIds
          .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
          .join(', ');

        const courseLabel =
          session.sessionType !== 'COURSE' && session.eventTitle
            ? `l'événement "${session.eventTitle}"`
            : confCourse
            ? `le cours "${confCourse.code} - ${confCourse.title}"`
            : 'un autre cours';

        const filiereDetail = confFiliere ? ` [Filière ${confFiliere.code} - ${confFiliere.name}]` : '';
        const teacherDetail = confTeacher ? ` avec ${confTeacher.name}` : '';
        const groupDetail = confGroupNames ? ` (Groupe: ${confGroupNames})` : '';

        conflicts.push({
          type: 'ROOM',
          message: `La salle "${room?.name || candidate.roomId}" est déjà occupée de ${session.startTime} à ${session.endTime} par ${courseLabel}${filiereDetail}${teacherDetail}${groupDetail}. (Si ce cours n'apparaît pas sur votre grille, vérifiez vos filtres actifs de filière ou groupe : ce cours appartient à une autre mention).`,
          conflictingSession: session,
        });
      }
    }
  }

  // 2. Check Teacher conflict, strict availability coverage, and weeklyMaxHours (skip if external speaker)
  if (candidate.teacherId && candidate.teacherId !== 'EXTERNAL_SPEAKER') {
    for (const session of activeSessionsOnDate) {
      if (session.teacherId === candidate.teacherId) {
        if (doIntervalsOverlap(candidate.startTime, candidate.endTime, session.startTime, session.endTime)) {
          const confCourse = options.courses?.find((c) => c.id === session.courseId);
          const confFiliere = options.filieres?.find((f) => f.id === confCourse?.filiereId);
          const confGroupNames = session.groupIds
            .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
            .join(', ');
          const courseLabel =
            session.sessionType !== 'COURSE' && session.eventTitle
              ? `sur l'événement "${session.eventTitle}"`
              : confCourse
              ? `sur le cours "${confCourse.code} - ${confCourse.title}"`
              : 'sur un autre cours';
          const filiereDetail = confFiliere ? ` (${confFiliere.code})` : '';
          const groupDetail = confGroupNames ? ` avec le groupe [${confGroupNames}]` : '';

          conflicts.push({
            type: 'TEACHER',
            message: `L'enseignant(e) ${teacher?.name || 'sélectionné(e)'} a déjà une séance programmée de ${session.startTime} à ${session.endTime} ${courseLabel}${filiereDetail}${groupDetail}.`,
            conflictingSession: session,
          });
        }
      }
    }

    if (teacher) {
      // 2a. Check Teacher Availabilities — EVERY session must be 100% covered by declared available slots
      if (Array.isArray(teacher.availabilities) && teacher.availabilities.length > 0 && candidate.date) {
        const dayIndex = new Date(`${candidate.date}T12:00:00`).getDay();
        const frenchDay = FRENCH_DAYS_BY_INDEX[dayIndex] || '';
        const daySlots = teacher.availabilities.filter(
          (a) => a.day.toUpperCase() === frenchDay.toUpperCase()
        );

        // Step 1: Any explicit unavailability overlapping the candidate slot blocks immediately
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
          // Step 2: If the teacher has declared ANY positive availability slots across the week,
          // the requested session MUST be integrally contained within the teacher's available intervals on that day.
          const allAvailableSlots = teacher.availabilities.filter((a) => a.available !== false);
          if (allAvailableSlots.length > 0) {
            const availableDaySlots = daySlots.filter((a) => a.available !== false);
            if (availableDaySlots.length === 0) {
              conflicts.push({
                type: 'AVAILABILITY',
                message: `L'enseignant(e) ${teacher.name} n'a aucun créneau de disponibilité déclaré le ${frenchDay}.`,
              });
            } else {
              const mergedAvailableIntervals = mergeTimeIntervals(
                availableDaySlots.map((slot) => getSlotTimeBounds(slot))
              );
              const isIntegrallyCovered = mergedAvailableIntervals.some(
                (interval) =>
                  candidateStartMin >= interval.startMin && candidateEndMin <= interval.endMin
              );

              if (!isIntegrallyCovered) {
                const allowedRangesStr = mergedAvailableIntervals
                  .map((i) => `${minutesToTime(i.startMin)}–${minutesToTime(i.endMin)}`)
                  .join(', ');
                conflicts.push({
                  type: 'AVAILABILITY',
                  message: `Horaire hors disponibilité pour ${teacher.name} le ${frenchDay} : la séance (${candidate.startTime}–${candidate.endTime}) doit être intégralement comprise dans ses créneaux disponibles (${allowedRangesStr}).`,
                });
              }
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

  // 4. Check Room Capacity (use actual studentCount ?? 0)
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

  // 5. Generate verified alternative slot suggestions if conflict found
  let suggestions: ConflictResult['suggestions'] = [];
  if (conflicts.length > 0 && includeSuggestions) {
    suggestions = findAlternativeSlots(candidate, existingSessions, rooms, groups, teachers, options);
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    suggestions,
  };
}

/**
 * Assistant de recherche de créneaux alternatifs :
 * Utilise le moteur unique `detectSessionConflicts(..., { includeSuggestions: false })`
 * pour garantir que chaque créneau suggéré respecte 100% des règles métier :
 * - Disponibilité intégrale de l'enseignant
 * - Quota horaire hebdomadaire de l'enseignant
 * - Capacité, statut et périodes de maintenance de la salle
 * - Absence de chevauchement salle / enseignant / groupes
 * - Jours ouvrables et absence de jour férié / vacance
 */
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
  teachers: User[],
  options: ConflictDetectionOptions = {}
): NonNullable<ConflictResult['suggestions']> {
  const suggestions: NonNullable<ConflictResult['suggestions']> = [];
  const rawDiff = timeToMinutes(candidate.endTime) - timeToMinutes(candidate.startTime);
  const durationMinutes = rawDiff > 0 ? rawDiff : 120;

  const candidateDate = candidate.date ? new Date(`${candidate.date}T12:00:00`) : new Date();
  const candidateStarts = ['07:30', '08:00', '08:30', '09:00', '10:30', '13:00', '13:30', '14:00', '15:00', '15:30'];

  const totalHeadcount = candidate.groupIds.reduce((acc, gId) => {
    const g = groups.find((grp) => grp.id === gId);
    return acc + (g?.studentCount ?? 0);
  }, 0);

  // Order rooms: prefer the requested room first if it has enough capacity, then sort by closest sufficient capacity
  const sortedRooms = [...rooms]
    .filter((r) => r.capacity >= totalHeadcount)
    .sort((a, b) => {
      if (a.id === candidate.roomId) return -1;
      if (b.id === candidate.roomId) return 1;
      return a.capacity - b.capacity;
    });

  // Search across the requested day and the next 10 calendar days (including next week if weekly quota was reached)
  for (let dayOffset = 0; dayOffset <= 10; dayOffset++) {
    const checkDate = new Date(candidateDate);
    checkDate.setDate(candidateDate.getDate() + dayOffset);
    if (checkDate.getDay() === 0) continue; // Skip Sunday

    const dateStr = getAntananarivoDateStr(checkDate);
    if (checkAcademicHolidayOrVacation(dateStr)) continue;

    for (const slotStart of candidateStarts) {
      const startMin = timeToMinutes(slotStart);
      const endMin = startMin + durationMinutes;
      if (endMin > 18 * 60 + 30) continue;
      const slotEnd = minutesToTime(endMin);

      if (
        dateStr === candidate.date &&
        slotStart === candidate.startTime &&
        slotEnd === candidate.endTime &&
        sortedRooms[0]?.id === candidate.roomId
      ) {
        // Still test other rooms at the same date/time below
      }

      for (const targetRoom of sortedRooms) {
        if (
          dateStr === candidate.date &&
          slotStart === candidate.startTime &&
          slotEnd === candidate.endTime &&
          targetRoom.id === candidate.roomId
        ) {
          continue;
        }

        // Validate candidate against the FULL conflict engine
        const fullCheck = detectSessionConflicts(
          {
            id: candidate.id,
            courseId: candidate.courseId,
            teacherId: candidate.teacherId,
            groupIds: candidate.groupIds,
            roomId: targetRoom.id,
            date: dateStr,
            startTime: slotStart,
            endTime: slotEnd,
          },
          existingSessions,
          rooms,
          groups,
          teachers,
          { ...options, includeSuggestions: false }
        );

        if (!fullCheck.hasConflict) {
          suggestions.push({
            date: dateStr,
            startTime: slotStart,
            endTime: slotEnd,
            roomId: targetRoom.id,
            roomName: targetRoom.name,
          });
          if (suggestions.length >= 4) return suggestions;
          // Once we found a valid room for this (date, slotStart), move to next time slot for diversity
          break;
        }
      }
    }
  }

  return suggestions;
}
