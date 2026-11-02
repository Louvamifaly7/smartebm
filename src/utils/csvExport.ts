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

export interface ExcelWorksheetDefinition {
  sheetName: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

const escapeXml = (val: string | number | boolean | null | undefined): string => {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/\r?\n|\r/g, ' ').trim();
  if (/^[=+@\t\r]/.test(str) || (str.startsWith('-') && !/^-[0-9]+([.,][0-9]+)?$/.test(str))) {
    str = `'${str}`;
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Exporte un classeur Excel multi-feuilles (.xls au format SpreadsheetML XML reconnu nativement par Microsoft Excel, LibreOffice Calc et Google Sheets).
 * Utilisé pour l'export multi-feuilles des emplois du temps (Planning Global, Par Enseignant, Par Groupe, Par Salle).
 */
export function downloadMultiSheetExcelWorkbook(
  filename: string,
  worksheets: ExcelWorksheetDefinition[]
): void {
  const usedNames = new Set<string>();
  const sanitizeSheetName = (raw: string, idx: number): string => {
    let cleaned = raw.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || `Feuille_${idx + 1}`;
    if (usedNames.has(cleaned.toLowerCase())) {
      cleaned = `${cleaned.slice(0, 24)}_${idx + 1}`;
    }
    usedNames.add(cleaned.toLowerCase());
    return escapeXml(cleaned);
  };

  const sheetsXml = worksheets
    .map((sheet, idx) => {
      const safeName = sanitizeSheetName(sheet.sheetName, idx);
      const headerCells = sheet.headers
        .map(
          (h) =>
            `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
        )
        .join('');

      const bodyRows = sheet.rows
        .map((row) => {
          const cells = row
            .map((cell) => {
              const isNum = typeof cell === 'number' && Number.isFinite(cell);
              const type = isNum ? 'Number' : 'String';
              return `<Cell ss:StyleID="sCell"><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
            })
            .join('');
          return `<Row>${cells}</Row>`;
        })
        .join('\n');

      return `<Worksheet ss:Name="${safeName}">
        <Table>
          <Row ss:Height="22">${headerCells}</Row>
          ${bodyRows}
        </Table>
      </Worksheet>`;
    })
    .join('\n');

  const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
    </Style>
    <Style ss:ID="sHeader">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#17345B" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sCell">
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
  </Styles>
  ${sheetsXml}
</Workbook>`;

  const blob = new Blob([workbookXml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  link.setAttribute('download', cleanName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

