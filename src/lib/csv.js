// Đọc / ghi CSV đơn giản (có dấu ngoặc kép, xuống dòng trong ô, tự nhận dấu , hoặc ;). File từ Excel tiếng Việt (UTF-8 hoặc UTF-8 BOM) đều đọc được.
export function parseCSV(text) {
  const t = text.replace(/^\uFEFF/, '').replace(/^sep=.\r?\n/i, ''), first = t.split(/\r?\n/, 1)[0], delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ','
  const rows = []; let row = [], cell = '', q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c }
    else if (c === '"') q = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x.trim())) rows.push(row); row = [] }
    else cell += c
  }
  row.push(cell); if (row.some((x) => x.trim())) rows.push(row)
  return rows
}
