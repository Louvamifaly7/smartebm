/**
 * Utilitaire centralisé d'exportation au format CSV (compatible Excel Français avec BOM UTF-8 et séparateur point-virgule).
 * Protégé contre l'injection de formules CSV/Excel (=, +, -, @, \t, \r) (P45).
 * Ne déclenche ni window.open ni window.alert.
 */

export function sanitizeCsvCell(cell: string | number | boolean | null | undefined): string {
  if (cell === null || cell === undefined) return '""';
  let str = String(cell).replace(/\r?\n|\r/g, ' ').trim();
  // Neutralize CSV formula injection (P45): prefix with single quote if starting with =, +, @, \t, \r, or - (unless strictly a numeric literal like -15 or -12.5)
  if (/^[=+@\t\r]/.test(str) || (str.startsWith('-') && !/^-[0-9]+([.,][0-9]+)?$/.test(str))) {
    str = `'${str}`;
  }
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const csvLines = [
    headers.map(sanitizeCsvCell).join(';'),
    ...rows.map((row) => row.map(sanitizeCsvCell).join(';')),
  ];

  // Add UTF-8 BOM (\uFEFF) so Excel on Windows/Mac recognizes French accents and semicolon delimiter automatically
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const cleanName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', cleanName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Alias for backward compatibility across components
export const exportToCsv = downloadCsvFile;
