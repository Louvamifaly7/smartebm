/**
 * Utility to export tabular data to a UTF-8 CSV file compatible with Excel.
 */
export const exportToCsv = (
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) => {
  const escapeCsvCell = (cell: string | number): string => {
    const str = String(cell ?? '');
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((row) => row.map(escapeCsvCell).join(';')),
  ].join('\n');

  // Add BOM for UTF-8 Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
