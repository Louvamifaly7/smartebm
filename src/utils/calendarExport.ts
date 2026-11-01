import { Course, Room, StudentGroup, TimetableSession, User } from '../types';

function formatICSDate(dateStr: string, timeStr: string): string {
  // Format: YYYYMMDDTHHmm00
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '').slice(0, 4).padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

function formatUtcTimestamp(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * Escapes special characters per RFC 5545 (\, ;, ,, newline).
 */
function escapeIcsText(val: string): string {
  return (val || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folds an ICS line at 73 characters per RFC 5545 section 3.1.
 */
function foldIcsLine(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 73));
  remaining = remaining.slice(73);
  while (remaining.length > 0) {
    parts.push(' ' + remaining.slice(0, 72));
    remaining = remaining.slice(72);
  }
  return parts.join('\r\n');
}

export function generateICSContent(
  sessions: TimetableSession[],
  courses: Course[],
  rooms: Room[],
  teachers: User[],
  includeCancelled = true
): string {
  const dtStamp = formatUtcTimestamp();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EBM Institute Madagascar//SIS Emplois du Temps//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:EBM Institute - Emploi du Temps',
    'X-WR-TIMEZONE:Indian/Antananarivo',
    'BEGIN:VTIMEZONE',
    'TZID:Indian/Antananarivo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0300',
    'TZNAME:EAT',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const session of sessions) {
    if (!includeCancelled && session.status === 'CANCELLED') continue;

    const course = courses.find((c) => c.id === session.courseId);
    const room = rooms.find((r) => r.id === session.roomId);
    const teacher = teachers.find((t) => t.id === session.teacherId);

    const dtStart = formatICSDate(session.date, session.startTime);
    const dtEnd = formatICSDate(session.date, session.endTime);
    const rawTitle = session.eventTitle || course?.title || 'Cours';
    const summary = escapeIcsText(
      `${session.status === 'CANCELLED' ? '[ANNULÉ] ' : ''}${rawTitle}${course?.code ? ` (${course.code})` : ''}`
    );
    const location = escapeIcsText(`${room?.name || 'Salle'}, ${room?.building || 'EBM Institute Antananarivo'}`);
    const speakerName = session.eventSpeaker || teacher?.name || 'Intervenant EBM';
    const description = escapeIcsText(
      `Enseignant/Intervenant: ${speakerName}\nStatut: ${session.status}\nNotes: ${session.notes || 'Aucune'}`
    );
    const icsStatus = session.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED';

    const eventLines = [
      'BEGIN:VEVENT',
      `UID:ebm-${session.id}@ebm-institute.edu`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=Indian/Antananarivo:${dtStart}`,
      `DTEND;TZID=Indian/Antananarivo:${dtEnd}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      `STATUS:${icsStatus}`,
      'END:VEVENT',
    ];

    eventLines.forEach((l) => lines.push(foldIcsLine(l)));
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICSFile(
  filename: string,
  sessions: TimetableSession[],
  courses: Course[],
  rooms: Room[],
  teachers: User[]
): void {
  const icsData = generateICSContent(sessions, courses, rooms, teachers);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function createGoogleCalendarUrl(
  session: TimetableSession,
  course?: Course,
  room?: Room,
  teacher?: User,
  groups?: StudentGroup[]
): string {
  const rawTitle = session.eventTitle || course?.title || 'Séance';
  const title = encodeURIComponent(`${rawTitle} - EBM Institute`);
  const startIso = formatICSDate(session.date, session.startTime);
  const endIso = formatICSDate(session.date, session.endTime);
  const dates = `${startIso}/${endIso}`;
  const groupLabels = session.groupIds
    .map((gid) => groups?.find((g) => g.id === gid)?.code || gid)
    .join(', ');
  const speakerName = session.eventSpeaker || teacher?.name || 'Intervenant EBM';
  const details = encodeURIComponent(
    `Enseignant: ${speakerName}\nPromotion(s): ${groupLabels}\nStatut: ${session.status}\nRemarque: ${session.notes || 'Séance officielle EBM Institute'}`
  );
  const location = encodeURIComponent(`${room?.name || 'Salle'}, ${room?.building || 'EBM Institute Antananarivo'}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&ctz=Indian/Antananarivo&details=${details}&location=${location}`;
}
