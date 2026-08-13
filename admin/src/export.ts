import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
  /** Column width in characters, for the Excel sheet. */
  width?: number;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Real .xlsx — Arabic is stored as plain unicode strings, so it survives. */
export function exportExcel<T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[],
): void {
  const data = rows.map((row) => {
    const record: Record<string, string | number> = {};
    for (const c of columns) record[c.header] = c.value(row);
    return record;
  });
  const sheet = XLSX.utils.json_to_sheet(data, {
    header: columns.map((c) => c.header),
  });
  sheet["!cols"] = columns.map((c) => ({ wch: c.width ?? 18 }));
  // Excel reads this to lay the sheet out right-to-left.
  sheet["!views"] = [{ RTL: true }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "البيانات");
  XLSX.writeFile(book, `${filename}-${stamp()}.xlsx`);
}

const PRINT_CSS = `
  @page { size: A4; margin: 14mm; }
  body { font-family: "Tajawal", "Segoe UI", sans-serif; color: #18181b; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #71717a; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: right; }
  th { background: #f4f4f5; font-weight: 700; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
`;

/**
 * PDF via the browser's own print dialog ("Save as PDF") rather than a JS PDF
 * library. jsPDF and friends do not shape Arabic — letters come out
 * disconnected and in the wrong order — whereas the browser already renders
 * this exact table correctly, so printing it is both simpler and right.
 *
 * The document is built with DOM calls and textContent, never HTML strings:
 * every cell here is user-supplied (names, emails, group notes), and
 * textContent cannot be talked into becoming markup.
 */
export function exportPdf<T>(
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert("متصفحك منع فتح النافذة — اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
    return;
  }
  const doc = win.document;
  doc.documentElement.lang = "ar";
  doc.documentElement.dir = "rtl";
  doc.title = title;

  const style = doc.createElement("style");
  style.textContent = PRINT_CSS; // static, no interpolation
  doc.head.appendChild(style);

  const h1 = doc.createElement("h1");
  h1.textContent = title;
  doc.body.appendChild(h1);

  const meta = doc.createElement("div");
  meta.className = "meta";
  meta.textContent = `${rows.length} سجل · ${new Date().toLocaleString("ar-MA", {
    timeZone: "Africa/Casablanca",
  })}`;
  doc.body.appendChild(meta);

  const table = doc.createElement("table");
  const thead = doc.createElement("thead");
  const headRow = doc.createElement("tr");
  for (const c of columns) {
    const th = doc.createElement("th");
    th.textContent = c.header;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = doc.createElement("tbody");
  for (const row of rows) {
    const tr = doc.createElement("tr");
    for (const c of columns) {
      const td = doc.createElement("td");
      td.textContent = String(c.value(row));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  doc.body.appendChild(table);

  // Layout is already done for a synchronously built DOM.
  win.focus();
  win.print();
}
