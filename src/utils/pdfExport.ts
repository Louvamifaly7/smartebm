import { TimetableSession, Course, Room, User, StudentGroup, StudentFee } from '../types';
import { escapeHtml, getAntananarivoDateStr } from './securityAndDateUtils';

/**
 * Triggers a clean, styled print / Save-as-PDF dialog using a hidden iframe
 * (avoids window.open / window.alert in iframe environments).
 */
function triggerHiddenIframePrint(htmlDocument: string, fallbackFileName: string) {
  try {
    const existing = document.getElementById('ebm-pdf-print-iframe');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'ebm-pdf-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlDocument);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          downloadPrintableHtmlFallback(htmlDocument, fallbackFileName);
        }
      }, 350);
    } else {
      downloadPrintableHtmlFallback(htmlDocument, fallbackFileName);
    }
  } catch {
    downloadPrintableHtmlFallback(htmlDocument, fallbackFileName);
  }
}

function downloadPrintableHtmlFallback(htmlDocument: string, fallbackFileName: string) {
  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fallbackFileName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const COMMON_PDF_STYLES = `
  @page {
    size: A4 landscape;
    margin: 12mm;
  }
  * {
    box-sizing: border-box;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  body {
    margin: 0;
    padding: 16px;
    color: #0f172a;
    background: #ffffff;
    font-size: 11px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #1e3a8a;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand img {
    height: 48px;
    width: auto;
    object-fit: contain;
  }
  .brand-title {
    font-size: 18px;
    font-weight: 800;
    color: #1e3a8a;
    margin: 0;
    letter-spacing: -0.3px;
  }
  .brand-sub {
    font-size: 11px;
    color: #475569;
    margin: 2px 0 0 0;
  }
  .doc-meta {
    text-align: right;
  }
  .doc-badge {
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    padding: 3px 8px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
  }
  .doc-title {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    margin: 6px 0 2px 0;
  }
  .doc-subtitle {
    font-size: 11px;
    color: #64748b;
    margin: 0;
  }
  .kpi-row {
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
  }
  .kpi-card {
    flex: 1;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 12px;
    background: #f8fafc;
  }
  .kpi-label {
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 700;
    color: #64748b;
    display: block;
  }
  .kpi-val {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 2px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #1e293b;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
  }
  .badge-emerald { background: #dcfce7; color: #166534; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-rose { background: #ffe4e6; color: #9f1239; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-purple { background: #f3e8ff; color: #6b21a8; }
  .footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #cbd5e1;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #64748b;
  }
  .signature-box {
    margin-top: 18px;
    display: flex;
    justify-content: space-between;
  }
  .sig-col {
    width: 220px;
    text-align: center;
    font-size: 10px;
  }
  .sig-line {
    margin-top: 38px;
    border-top: 1px dashed #94a3b8;
    padding-top: 4px;
    font-weight: 700;
    color: #334155;
  }
`;

/**
 * 1. EXPORT PDF DES EMPLOIS DU TEMPS (BIEN MIS EN PAGE)
 */
export function exportTimetableToPDF(params: {
  title: string;
  subtitle: string;
  weekLabel: string;
  sessions: TimetableSession[];
  courses: Course[];
  rooms: Room[];
  users: User[];
  groups: StudentGroup[];
}) {
  const { title, subtitle, weekLabel, sessions, courses, rooms, users, groups } = params;

  const sortedSessions = [...sessions].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });

  const totalHours = sortedSessions
    .filter((s) => s.status !== 'CANCELLED')
    .reduce((acc, s) => acc + (s.durationHours || 2), 0);

  const rowsHtml =
    sortedSessions.length === 0
      ? `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #64748b;">Aucune séance planifiée sur cette sélection.</td></tr>`
      : sortedSessions
          .map((s) => {
            const course = courses.find((c) => c.id === s.courseId);
            const room = rooms.find((r) => r.id === s.roomId);
            const teacher = users.find((u) => u.id === s.teacherId);
            const groupNames = s.groupIds
              .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
              .join(', ');
            const isEvent = s.sessionType && s.sessionType !== 'COURSE';
            const typeLabel = isEvent
              ? s.sessionType === 'CONFERENCE'
                ? 'Conférence'
                : s.sessionType === 'SEMINAIRE'
                ? 'Séminaire'
                : s.sessionType === 'SOUTENANCE'
                ? 'Soutenance'
                : s.sessionType === 'EXAMEN'
                ? 'Examen'
                : s.eventCategoryLabel || 'Événement'
              : 'Cours Magistral / TD';

            const statusLabel =
              s.status === 'COMPLETED_VALIDATED'
                ? '<span class="badge badge-emerald">Réalisé & Validé</span>'
                : s.status === 'CANCELLED'
                ? '<span class="badge badge-rose">Annulé</span>'
                : s.status === 'RESCHEDULED'
                ? '<span class="badge badge-amber">Reporté</span>'
                : '<span class="badge badge-blue">Publié</span>';

            const dateFormatted = new Date(s.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return `
              <tr>
                <td style="font-weight:700; text-transform:capitalize;">${escapeHtml(dateFormatted)}</td>
                <td style="font-family:monospace; font-weight:700; color:#1e3a8a;">${escapeHtml(s.startTime)} - ${escapeHtml(s.endTime)} (${escapeHtml(s.durationHours)}h)</td>
                <td>
                  <div style="font-weight:800; color:#0f172a;">${escapeHtml(s.eventTitle || course?.title || 'Séance')}</div>
                  <div style="font-size:9px; color:#64748b;">${course?.code ? `Code EC : ${escapeHtml(course.code)} • ` : ''}${escapeHtml(typeLabel)}</div>
                </td>
                <td style="font-weight:700;">${escapeHtml(s.eventSpeaker || teacher?.name || 'Intervenant EBM')}</td>
                <td><span class="badge badge-purple">${escapeHtml(groupNames || 'Tous groupes')}</span></td>
                <td style="font-weight:700; color:#0f766e;">${escapeHtml(room?.name || s.roomId)}</td>
                <td>${statusLabel}</td>
              </tr>
            `;
          })
          .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)} - EBM Institute</title>
      <style>${COMMON_PDF_STYLES}</style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <img src="/assets/aistudio/logo_540e8d94.png" alt="EBM Logo" onerror="this.style.display='none'" />
          <div>
            <h1 class="brand-title">EBM INSTITUTE MADAGASCAR</h1>
            <p class="brand-sub">Direction des Études & de la Planification Académique LMD</p>
          </div>
        </div>
        <div class="doc-meta">
          <span class="doc-badge">Document Officiel Emploi du Temps</span>
          <h2 class="doc-title">${escapeHtml(title)}</h2>
          <p class="doc-subtitle">${escapeHtml(subtitle)} • ${escapeHtml(weekLabel)}</p>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-label">Période / Semaine</span>
          <div class="kpi-val">${escapeHtml(weekLabel)}</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Nombre de Séances</span>
          <div class="kpi-val">${sortedSessions.length} séance(s)</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Volume Horaire Total</span>
          <div class="kpi-val">${totalHours} Heures</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Date d'édition</span>
          <div class="kpi-val">${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:16%">Jour & Date</th>
            <th style="width:13%">Horaire</th>
            <th style="width:26%">Matière (EC) / Événement</th>
            <th style="width:16%">Enseignant / Intervenant</th>
            <th style="width:11%">Promotion(s)</th>
            <th style="width:10%">Salle</th>
            <th style="width:8%">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signature-box">
        <div class="sig-col">
          <div class="sig-line">Le Responsable Planification</div>
        </div>
        <div class="sig-col">
          <div class="sig-line">La Direction Académique EBM</div>
        </div>
      </div>

      <div class="footer">
        <span>EBM Institute — Système Intégré de Gestion Universitaire (SIS LMD)</span>
        <span>Imprimé le ${new Date().toLocaleString('fr-FR')}</span>
      </div>
    </body>
    </html>
  `;

  triggerHiddenIframePrint(html, `Emploi_du_Temps_EBM_${getAntananarivoDateStr()}`);
}

/**
 * 2. EXPORT PDF DU PLANNING PAR ENSEIGNANT (SEMAINE / MOIS / SEMESTRE)
 */
export function exportTeacherScheduleToPDF(params: {
  teacher: User;
  periodType: 'WEEK' | 'MONTH' | 'SEMESTER';
  periodLabel: string;
  sessions: TimetableSession[];
  courses: Course[];
  rooms: Room[];
  groups: StudentGroup[];
}) {
  const { teacher, periodType, periodLabel, sessions, courses, rooms, groups } = params;

  const periodTitle =
    periodType === 'WEEK'
      ? 'Planning Hebdomadaire Enseignant'
      : periodType === 'MONTH'
      ? 'Planning Mensuel Enseignant'
      : 'Planning Semestriel Enseignant';

  const sortedSessions = [...sessions].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });

  const activeSessions = sortedSessions.filter((s) => s.status !== 'CANCELLED');
  const totalHours = activeSessions.reduce((acc, s) => acc + (s.durationHours || 2), 0);
  const validatedHours = activeSessions
    .filter((s) => s.status === 'COMPLETED_VALIDATED')
    .reduce((acc, s) => acc + (s.durationHours || 2), 0);
  const hourlyRate = teacher.hourlyRateAr || 35000;
  const estimatedVacationAr = totalHours * hourlyRate;

  const rowsHtml =
    sortedSessions.length === 0
      ? `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #64748b;">Aucun cours programmé pour ${teacher.name} sur la période sélectionnée (${periodLabel}).</td></tr>`
      : sortedSessions
          .map((s) => {
            const course = courses.find((c) => c.id === s.courseId);
            const room = rooms.find((r) => r.id === s.roomId);
            const groupNames = s.groupIds
              .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
              .join(', ');

            const statusBadge =
              s.status === 'COMPLETED_VALIDATED'
                ? '<span class="badge badge-emerald">Effectué & Validé</span>'
                : s.status === 'CANCELLED'
                ? '<span class="badge badge-rose">Annulé</span>'
                : s.status === 'RESCHEDULED'
                ? '<span class="badge badge-amber">Reporté</span>'
                : '<span class="badge badge-blue">Planifié</span>';

            return `
              <tr>
                <td style="font-weight:700;">${escapeHtml(new Date(s.date).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }))}</td>
                <td style="font-family:monospace; font-weight:700; color:#1e3a8a;">${escapeHtml(s.startTime)} - ${escapeHtml(s.endTime)}</td>
                <td style="text-align:center; font-weight:800;">${escapeHtml(s.durationHours)}h</td>
                <td>
                  <div style="font-weight:800;">${escapeHtml(s.eventTitle || course?.title || 'Cours')}</div>
                  <div style="font-size:9px; color:#64748b;">${escapeHtml(course?.code || s.sessionType || 'EC')}</div>
                </td>
                <td><span class="badge badge-purple">${escapeHtml(groupNames)}</span></td>
                <td style="font-weight:700; color:#0f766e;">${escapeHtml(room?.name || s.roomId)}</td>
                <td>${statusBadge}</td>
              </tr>
            `;
          })
          .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(periodTitle)} - ${escapeHtml(teacher.name)}</title>
      <style>${COMMON_PDF_STYLES}</style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <img src="/assets/aistudio/logo_540e8d94.png" alt="EBM Logo" onerror="this.style.display='none'" />
          <div>
            <h1 class="brand-title">EBM INSTITUTE MADAGASCAR</h1>
            <p class="brand-sub">Direction du Corps Enseignant & Suivi des Volumes Horaires</p>
          </div>
        </div>
        <div class="doc-meta">
          <span class="doc-badge">${escapeHtml(periodTitle)}</span>
          <h2 class="doc-title">${teacher.civilite ? `${escapeHtml(teacher.civilite)} ` : ''}${escapeHtml(teacher.name)}</h2>
          <p class="doc-subtitle">${escapeHtml(teacher.academicRank || 'Enseignant Universitaire')} • ${escapeHtml(teacher.highestDiploma || 'Diplôme Supérieur')} • Période : ${escapeHtml(periodLabel)}</p>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-label">Enseignant & Grade</span>
          <div class="kpi-val">${escapeHtml(teacher.name)}</div>
          <div style="font-size:10px; color:#475569;">${escapeHtml(teacher.email)} • ${escapeHtml(teacher.phone || '')}</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Période Sélectionnée</span>
          <div class="kpi-val">${escapeHtml(periodLabel)}</div>
          <div style="font-size:10px; color:#475569;">${activeSessions.length} séance(s) active(s)</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Volume Horaire Planifié / Validé</span>
          <div class="kpi-val">${totalHours}h planifiées (${validatedHours}h validées)</div>
          <div style="font-size:10px; color:#475569;">Quota hebdo : ${teacher.weeklyMaxHours || 20}h</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Taux Horaire & Estimation</span>
          <div class="kpi-val">${hourlyRate.toLocaleString()} Ar/h</div>
          <div style="font-size:10px; color:#059669; font-weight:700;">Total période : ${estimatedVacationAr.toLocaleString()} Ar</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:16%">Date</th>
            <th style="width:13%">Créneau Horaire</th>
            <th style="width:8%; text-align:center;">Durée</th>
            <th style="width:29%">Élément Constitutif (EC) / Activité</th>
            <th style="width:12%">Groupe / Promo</th>
            <th style="width:12%">Salle</th>
            <th style="width:10%">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signature-box">
        <div class="sig-col">
          <div class="sig-line">Signature de l'Enseignant</div>
        </div>
        <div class="sig-col">
          <div class="sig-line">Direction des Études EBM</div>
        </div>
      </div>

      <div class="footer">
        <span>Fiche Planning Officielle Enseignant — EBM Institute Madagascar</span>
        <span>Édité le ${new Date().toLocaleString('fr-FR')}</span>
      </div>
    </body>
    </html>
  `;

  triggerHiddenIframePrint(html, `Planning_${teacher.name.replace(/\s+/g, '_')}_${periodType}`);
}

/**
 * 3. EXPORT PDF DES ÉTATS DE PAIEMENT & TABLEAU CROISÉ DYNAMIQUE PAR GROUPE / FILTRE
 */
export function exportFinancialStateToPDF(params: {
  title: string;
  groupLabel: string;
  statusFilterLabel: string;
  academicYear: string;
  fees: StudentFee[];
  rows: Array<{
    matricule: string;
    studentName: string;
    groupCode: string;
    feeCells: Record<string, { paidAr: number; remainingAr: number; totalAr: number }>;
    totalFeesAr: number;
    totalPaidAr: number;
    balanceDueAr: number;
    status: 'SOLDÉ' | 'PARTIEL' | 'IMPAYÉ';
  }>;
}) {
  const { title, groupLabel, statusFilterLabel, academicYear, fees, rows } = params;

  const grandTotalFees = rows.reduce((acc, r) => acc + r.totalFeesAr, 0);
  const grandTotalPaid = rows.reduce((acc, r) => acc + r.totalPaidAr, 0);
  const grandTotalDue = rows.reduce((acc, r) => acc + r.balanceDueAr, 0);
  const recoveryRate = grandTotalFees > 0 ? Math.round((grandTotalPaid / grandTotalFees) * 100) : 100;

  const feeHeadersHtml = fees
    .map(
      (f) =>
        `<th style="text-align:right; font-size:9px;">${escapeHtml(f.title)}<br/><span style="font-weight:400; color:#cbd5e1;">(${f.amountAr.toLocaleString()} Ar)</span></th>`
    )
    .join('');

  const bodyRowsHtml =
    rows.length === 0
      ? `<tr><td colspan="${fees.length + 7}" style="text-align:center; padding: 20px;">Aucun étudiant ne correspond aux filtres sélectionnés.</td></tr>`
      : rows
          .map((r) => {
            const feeCols = fees
              .map((f) => {
                const cell = r.feeCells[f.id] || { paidAr: 0, remainingAr: f.amountAr, totalAr: f.amountAr };
                const isPaid = cell.remainingAr === 0;
                const isPartial = cell.paidAr > 0 && cell.remainingAr > 0;
                return `
                  <td style="text-align:right; font-size:9.5px;">
                    <div style="font-weight:700; color:${isPaid ? '#166534' : isPartial ? '#0f766e' : '#64748b'};">
                      Payé: ${cell.paidAr.toLocaleString()}
                    </div>
                    <div style="font-size:8.5px; color:${cell.remainingAr > 0 ? '#be123c' : '#15803d'}; font-weight:700;">
                      Reste: ${cell.remainingAr.toLocaleString()}
                    </div>
                  </td>
                `;
              })
              .join('');

            const badgeHtml =
              r.status === 'SOLDÉ'
                ? '<span class="badge badge-emerald">SOLDÉ</span>'
                : r.status === 'PARTIEL'
                ? '<span class="badge badge-amber">PARTIEL</span>'
                : '<span class="badge badge-rose">IMPAYÉ</span>';

            return `
              <tr>
                <td style="font-family:monospace; font-weight:700;">${escapeHtml(r.matricule)}</td>
                <td style="font-weight:700;">${escapeHtml(r.studentName)}</td>
                <td><span class="badge badge-blue">${escapeHtml(r.groupCode)}</span></td>
                ${feeCols}
                <td style="text-align:right; font-weight:700;">${r.totalFeesAr.toLocaleString()} Ar</td>
                <td style="text-align:right; font-weight:800; color:#15803d;">${r.totalPaidAr.toLocaleString()} Ar</td>
                <td style="text-align:right; font-weight:800; color:${r.balanceDueAr > 0 ? '#be123c' : '#15803d'};">${r.balanceDueAr.toLocaleString()} Ar</td>
                <td style="text-align:center;">${badgeHtml}</td>
              </tr>
            `;
          })
          .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)} - Pôle Finance EBM</title>
      <style>${COMMON_PDF_STYLES}</style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <img src="/assets/aistudio/logo_540e8d94.png" alt="EBM Logo" onerror="this.style.display='none'" />
          <div>
            <h1 class="brand-title">EBM INSTITUTE — PÔLE FINANCE & COMPTABILITÉ</h1>
            <p class="brand-sub">État Officiel des Frais Payés et Restant à Payer par Étudiant (Tableau Croisé)</p>
          </div>
        </div>
        <div class="doc-meta">
          <span class="doc-badge">État Financier & Recouvrement</span>
          <h2 class="doc-title">${escapeHtml(title)}</h2>
          <p class="doc-subtitle">Promotion : ${escapeHtml(groupLabel)} • Filtre : ${escapeHtml(statusFilterLabel)} • Année ${escapeHtml(academicYear)}</p>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-label">Effectif Filtré</span>
          <div class="kpi-val">${rows.length} étudiant(s)</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Facturé</span>
          <div class="kpi-val">${grandTotalFees.toLocaleString()} Ar</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Déjà Payé (Encaissé)</span>
          <div class="kpi-val" style="color:#15803d;">${grandTotalPaid.toLocaleString()} Ar (${recoveryRate}%)</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Non Encore Payé (Reste Dû)</span>
          <div class="kpi-val" style="color:#be123c;">${grandTotalDue.toLocaleString()} Ar</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Matricule</th>
            <th>Étudiant</th>
            <th>Groupe</th>
            ${feeHeadersHtml}
            <th style="text-align:right;">Total Facturé</th>
            <th style="text-align:right;">Total Payé</th>
            <th style="text-align:right;">Reste à Payer</th>
            <th style="text-align:center;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRowsHtml}
        </tbody>
      </table>

      <div class="signature-box">
        <div class="sig-col">
          <div class="sig-line">Le Chef Comptable / Caissier Principal</div>
        </div>
        <div class="sig-col">
          <div class="sig-line">Direction Administrative & Financière</div>
        </div>
      </div>

      <div class="footer">
        <span>EBM Institute — Pôle Finance & Caisse (Monnaie : Ariary MGA)</span>
        <span>Imprimé le ${new Date().toLocaleString('fr-FR')}</span>
      </div>
    </body>
    </html>
  `;

  triggerHiddenIframePrint(html, `Etat_Paiements_EBM_${groupLabel.replace(/\s+/g, '_')}`);
}
