/**
 * Utilitaire centralisé d'exportation au format CSV (compatible Excel Français avec BOM UTF-8 et séparateur point-virgule).
 * Ne déclenche ni window.open ni window.alert.
 */

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const escapeCsvCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/\r?\n|\r/g, ' ').trim();
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csvLines = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((row) => row.map(escapeCsvCell).join(';')),
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
