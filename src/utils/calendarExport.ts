import { Course, Room, TimetableSession, User } from '../types';

function formatICSDate(dateStr: string, timeStr: string): string {
  // Format: YYYYMMDDTHHmm00
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

export function generateICSContent(
  sessions: TimetableSession[],
  courses: Course[],
  rooms: Room[],
  teachers: User[]
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EBM Institute//Emplois du Temps//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:EBM Institute - Emploi du Temps',
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  for (const session of sessions) {
    if (session.status === 'CANCELLED') continue;

    const course = courses.find((c) => c.id === session.courseId);
    const room = rooms.find((r) => r.id === session.roomId);
    const teacher = teachers.find((t) => t.id === session.teacherId);

    const dtStart = formatICSDate(session.date, session.startTime);
    const dtEnd = formatICSDate(session.date, session.endTime);
    const summary = `${course?.title || 'Cours'} (${course?.code || ''})`;
    const location = `${room?.name || 'Salle'}, ${room?.building || 'EBM Institute'}`;
    const description = `Enseignant: ${teacher?.name || 'Non assigné'}\\nStatut: ${session.status}\\nNotes: ${session.notes || 'Aucune'}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:ebm-${session.id}@ebm-institute.edu`,
      `DTSTAMP:${formatICSDate(new Date().toISOString().split('T')[0], '00:00')}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT'
    );
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
  URL.revokeObjectURL(url);
}

export function createGoogleCalendarUrl(
  session: TimetableSession,
  course?: Course,
  room?: Room,
  teacher?: User
): string {
  const title = encodeURIComponent(`${course?.title || 'Séance'} - EBM Institute`);
  const startIso = formatICSDate(session.date, session.startTime);
  const endIso = formatICSDate(session.date, session.endTime);
  const dates = `${startIso}/${endIso}`;
  const details = encodeURIComponent(
    `Enseignant: ${teacher?.name || 'Non assigné'}\nGroupe: ${session.groupIds.join(', ')}\nStatut: ${session.status}\nRemarque: ${session.notes || 'Séance officielle EBM Institute'}`
  );
  const location = encodeURIComponent(`${room?.name || 'Salle'}, ${room?.building || 'EBM Institute'}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}
