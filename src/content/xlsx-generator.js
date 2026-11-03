const clean = (value, max = 300) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);

export function normalizeWorkbook(input) {
  if (!input || !Array.isArray(input.sheets) || input.sheets.length < 1 || input.sheets.length > 8) throw new Error("Workbook perlu 1–8 sheet.");
  const used = new Set();
  const sheets = input.sheets.map((sheet, index) => {
    let name = clean(sheet.name || `Sheet ${index + 1}`, 31).replace(/[\\/?*\[\]:]/g, " ").trim() || `Sheet ${index + 1}`;
    const base = name; let suffix = 2;
    while (used.has(name.toLowerCase())) name = `${base.slice(0, 27)} ${suffix++}`;
    used.add(name.toLowerCase());
    const headers = Array.isArray(sheet.headers) ? sheet.headers.slice(0, 30).map((x) => clean(x, 100)) : [];
    const rows = Array.isArray(sheet.rows) ? sheet.rows.slice(0, 500).map((row) => Array.isArray(row) ? row.slice(0, 30).map((v) => typeof v === "number" && Number.isFinite(v) ? v : typeof v === "boolean" ? v : clean(v, 2000)) : []) : [];
    const formulas = Array.isArray(sheet.formulas) ? sheet.formulas.slice(0, 100).map((item) => ({ cell: clean(item.cell, 8).toUpperCase(), formula: clean(item.formula, 500), numFmt: clean(item.numFmt, 40) })) : [];
    if (!headers.length && !rows.length) throw new Error(`Sheet ${name} masih kosong.`);
    const safeFunctions = new Set(["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "COUNTA", "ROUND", "ABS", "PRODUCT", "SUBTOTAL"]);
    if (formulas.some((item) => !/^[A-Z]{1,3}[1-9]\d{0,5}$/.test(item.cell) || !/^[A-Z0-9_()+*/.,:$ -]+$/i.test(item.formula) || [...item.formula.matchAll(/([A-Z][A-Z0-9.]*)\s*\(/gi)].some((match) => !safeFunctions.has(match[1].toUpperCase())))) throw new Error(`Formula tidak valid di sheet ${name}. Gunakan formula aritmetika atau fungsi umum yang aman.`);
    return { name, headers, rows, formulas, columnWidths: Array.isArray(sheet.columnWidths) ? sheet.columnWidths.slice(0, 30).map((n) => Math.max(8, Math.min(50, Number(n) || 16))) : [], freezeRows: Math.max(0, Math.min(10, Number(sheet.freezeRows) || 0)), autoFilter: sheet.autoFilter !== false };
  });
  return { title: clean(input.title, 120) || "Workbook", sheets };
}

export async function downloadWorkbook(input) {
  const data = normalizeWorkbook(input);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
  const colName = (number) => { let name = ""; while (number) { const r = (number - 1) % 26; name = String.fromCharCode(65 + r) + name; number = Math.floor((number - 1) / 26); } return name; };
  const xml = (value) => new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${value}`);
  const files = new Map();
  files.set("[Content_Types].xml", xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${data.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`));
  files.set("_rels/.rels", xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`));
  files.set("xl/workbook.xml", xml(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><bookViews><workbookView/></bookViews><sheets>${data.sheets.map((sheet, i) => `<sheet name="${esc(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`));
  files.set("xl/_rels/workbook.xml.rels", xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${data.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${data.sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`));
  files.set("xl/styles.xml", xml(`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/><color rgb="FF243B53"/></font><font><b/><sz val="11"/><name val="Arial"/><color rgb="FFFFFFFF"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF243B53"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="1" borderId="0" xfId="0"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="0" fillId="1" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`));
  data.sheets.forEach((sheet, sheetIndex) => {
    const baseRowCount = sheet.rows.length + (sheet.headers.length ? 1 : 0);
    const formulaRowCount = sheet.formulas.reduce((max, item) => Math.max(max, Number(item.cell.match(/\d+$/)?.[0] || 0)), 0);
    const rowCount = Math.max(baseRowCount, formulaRowCount);
    const formulaColCount = sheet.formulas.reduce((max, item) => { let n = 0; for (const c of item.cell.match(/^[A-Z]+/)[0]) n = n * 26 + c.charCodeAt(0) - 64; return Math.max(max, n); }, 0);
    const colCount = Math.max(sheet.headers.length, ...sheet.rows.map((row) => row.length), formulaColCount, 1);
    const rows = [];
    const allRows = sheet.headers.length ? [sheet.headers, ...sheet.rows] : [...sheet.rows];
    while (allRows.length < rowCount) allRows.push([]);
    allRows.forEach((values, rowIndex) => {
      const excelRow = rowIndex + 1;
      const cells = values.map((value, colIndex) => {
        const ref = `${colName(colIndex + 1)}${excelRow}`;
        const formula = sheet.formulas.find((item) => item.cell === ref);
        if (formula) return `<c r="${ref}" s="3"><f>${esc(formula.formula)}</f><v></v></c>`;
        const style = sheet.headers.length && rowIndex === 0 ? 1 : typeof value === "number" ? (rowIndex % 2 ? 4 : 3) : (rowIndex > 0 && rowIndex % 2 === 0 ? 2 : 0);
        if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
        if (typeof value === "boolean") return `<c r="${ref}" t="b" s="${style}"><v>${value ? 1 : 0}</v></c>`;
        return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
      }).join("");
      rows.push(`<row r="${excelRow}"${excelRow === 1 && sheet.headers.length ? " ht=\"24\" customHeight=\"1\"" : ""}>${cells}</row>`);
    });
    const cols = Array.from({ length: colCount }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${sheet.columnWidths[i] || Math.max(14, Math.min(34, String(sheet.headers[i] || "Kolom").length + 4))}" customWidth="1"/>`).join("");
    const freeze = sheet.freezeRows ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.freezeRows}" topLeftCell="A${sheet.freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews>` : "";
    const filter = sheet.autoFilter && sheet.headers.length ? `<autoFilter ref="A1:${colName(sheet.headers.length)}${Math.max(1, rowCount)}"/>` : "";
    files.set(`xl/worksheets/sheet${sheetIndex + 1}.xml`, xml(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}<cols>${cols}</cols><sheetData>${rows.join("")}</sheetData>${filter}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`));
  });
  const buffer = makeStoredZip(files);
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a"); a.href = url; a.download = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "workbook"}.xlsx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeStoredZip(files) {
  const encoder = new TextEncoder();
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (bytes) => { let crc = 0xFFFFFFFF; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0; };
  const parts = []; const entries = []; let offset = 0;
  const add16 = (view, at, value) => view.setUint16(at, value, true); const add32 = (view, at, value) => view.setUint32(at, value >>> 0, true);
  for (const [path, data] of files) {
    const name = encoder.encode(path); const body = data instanceof Uint8Array ? data : encoder.encode(data); const crc = crc32(body);
    const local = new Uint8Array(30 + name.length); const lv = new DataView(local.buffer); add32(lv, 0, 0x04034B50); add16(lv, 4, 20); add16(lv, 6, 0x0800); add16(lv, 8, 0); add32(lv, 14, crc); add32(lv, 18, body.length); add32(lv, 22, body.length); add16(lv, 26, name.length); local.set(name, 30);
    parts.push(local, body); entries.push({ name, crc, size: body.length, offset }); offset += local.length + body.length;
  }
  const centralOffset = offset;
  for (const entry of entries) {
    const central = new Uint8Array(46 + entry.name.length); const view = new DataView(central.buffer); add32(view, 0, 0x02014B50); add16(view, 4, 20); add16(view, 6, 20); add16(view, 8, 0x0800); add16(view, 10, 0); add32(view, 16, entry.crc); add32(view, 20, entry.size); add32(view, 24, entry.size); add16(view, 28, entry.name.length); add32(view, 42, entry.offset); central.set(entry.name, 46); parts.push(central); offset += central.length;
  }
  const centralSize = offset - centralOffset; const end = new Uint8Array(22); const ev = new DataView(end.buffer); add32(ev, 0, 0x06054B50); add16(ev, 8, entries.length); add16(ev, 10, entries.length); add32(ev, 12, centralSize); add32(ev, 16, centralOffset); parts.push(end);
  return new Blob(parts, { type: "application/zip" });
}
