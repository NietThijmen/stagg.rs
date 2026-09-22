export interface TableColumn {
  key: string;
  header: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function printTable(
  rows: Array<Record<string, unknown>>,
  columns: TableColumn[],
): void {
  if (rows.length === 0) {
    console.log('No results.');
    return;
  }

  const cells = rows.map((row) => columns.map((column) => formatCell(row[column.key])));
  const widths = columns.map((column, index) =>
    Math.max(
      column.header.length,
      ...cells.map((row) => (row[index] ?? '').length),
    ),
  );

  const header = columns
    .map((column, index) => column.header.padEnd(widths[index] ?? 0))
    .join('  ')
    .trimEnd();

  console.log(header);
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));

  for (const row of cells) {
    console.log(
      row.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join('  ').trimEnd(),
    );
  }
}
