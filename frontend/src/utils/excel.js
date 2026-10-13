import * as XLSX from 'xlsx';

/**
 * Export JSON array data to Excel (.xlsx) file directly in the browser
 * @param {Array<Object>} data - Array of objects to be converted to spreadsheet rows
 * @param {string} fileName - Target filename (default: 'export.xlsx')
 * @param {string} sheetName - Name of the worksheet tab (default: 'Sheet1')
 */
export const exportToExcel = (data, fileName = 'export.xlsx', sheetName = 'Data') => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Tidak ada data untuk diekspor');
  }

  // Convert JSON to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto calculate column widths for nice appearance
  const columnKeys = Object.keys(data[0] || {});
  worksheet['!cols'] = columnKeys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Trigger browser download
  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, safeFileName);
};
