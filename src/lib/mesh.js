// Phân tích file 3D ngay trên trình duyệt: STL (nhị phân/ASCII) và 3MF (zip + XML). Chỉ tính được THỂ TÍCH chính xác;
// khối lượng và thời gian in là ƯỚC TÍNH (thời gian thật phụ thuộc phần mềm slicer và máy in).
const UNIT_MM = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 }
const triVol = (ax, ay, az, bx, by, bz, cx, cy, cz) => (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
const attrs = (s) => { const o = {}; for (const m of s.matchAll(/([\w:]+)="([^"]*)"/g)) o[m[1]] = m[2]; return o }
const det3 = (t) => { const [a, b, c, d, e, f, g, h, i] = t; return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g) }
const detOf = (tr) => { if (!tr) return 1; const t = tr.trim().split(/\s+/).map(Number); return t.length >= 9 && t.every(Number.isFinite) ? Math.abs(det3(t)) : 1 }

function stl(buf) {
  const dv = new DataView(buf)
  const n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0
  let sum = 0, tris = 0; const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  const bump = (x, y, z) => { if (x < mn[0]) mn[0] = x; if (y < mn[1]) mn[1] = y; if (z < mn[2]) mn[2] = z; if (x > mx[0]) mx[0] = x; if (y > mx[1]) mx[1] = y; if (z > mx[2]) mx[2] = z }
  if (buf.byteLength === 84 + 50 * n && n > 0) { // nhị phân
    for (let i = 0, o = 84; i < n; i++, o += 50) {
      const v = []; for (let k = 0; k < 9; k++) v.push(dv.getFloat32(o + 12 + k * 4, true))
      sum += triVol(...v); bump(v[0], v[1], v[2]); bump(v[3], v[4], v[5]); bump(v[6], v[7], v[8]); tris++
    }
  } else { // ASCII
    const txt = new TextDecoder().decode(buf), pts = []
    if (!/^\s*solid/i.test(txt) || !/facet/i.test(txt)) throw new Error('File STL không hợp lệ hoặc bị lỗi')
    for (const m of txt.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi)) pts.push(+m[1], +m[2], +m[3])
    if (pts.length < 9 || pts.length % 9) throw new Error('File STL ASCII bị thiếu dữ liệu')
    for (let i = 0; i < pts.length; i += 9) { sum += triVol(...pts.slice(i, i + 9)); bump(pts[i], pts[i + 1], pts[i + 2]); bump(pts[i + 3], pts[i + 4], pts[i + 5]); bump(pts[i + 6], pts[i + 7], pts[i + 8]); tris++ }
  }
  if (!tris) throw new Error('File STL không có hình học')
  return { format: 'STL', volumeMm3: Math.abs(sum), triangles: tris, size: mx.map((v, i) => v - mn[i]) }
}

async function inflateRaw(bytes) {
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
}
async function unzipModels(buf) { // đọc các file *.model trong zip (3MF)
  const u8 = new Uint8Array(buf), dv = new DataView(buf)
  let e = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break }
  if (e < 0) throw new Error('File 3MF không hợp lệ (không phải file zip)')
  const count = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {}
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('File 3MF bị lỗi cấu trúc')
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true)
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl
    if (!/\.model$/i.test(name)) continue
    if (usize > 400 * 1024 * 1024) throw new Error('File 3MF quá lớn để phân tích')
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), data = u8.subarray(start, start + csize)
    const raw = method === 0 ? data : method === 8 ? new Uint8Array(await inflateRaw(data)) : null
    if (!raw) throw new Error('3MF dùng kiểu nén không hỗ trợ')
    out[name.startsWith('/') ? name : '/' + name] = new TextDecoder().decode(raw)
  }
  return out
}
async function threeMF(buf) {
  const files = await unzipModels(buf), names = Object.keys(files)
  if (!names.length) throw new Error('File 3MF không chứa mô hình 3D')
  const main = names.find((n) => /^\/3D\/3dmodel\.model$/i.test(n)) || names[0]
  const unit = UNIT_MM[(files[main].match(/<model\b[^>]*\bunit="([^"]+)"/) || [])[1]] ?? 1
  const objs = {} // `${file}#${id}` -> { vol } | { comps }
  for (const [file, xml] of Object.entries(files)) {
    for (const m of xml.matchAll(/<object\b([^>]*?)>([\s\S]*?)<\/object>/g)) {
      const id = attrs(m[1]).id, body = m[2], key = `${file}#${id}`
      const vs = []; for (const v of body.matchAll(/<vertex\b([^>]*?)\/?>/g)) { const a = attrs(v[1]); vs.push(+a.x, +a.y, +a.z) }
      if (vs.length) {
        let sum = 0, tris = 0
        for (const t of body.matchAll(/<triangle\b([^>]*?)\/?>/g)) {
          const a = attrs(t[1]), i = a.v1 * 3, j = a.v2 * 3, k = a.v3 * 3
          if (!(vs[i + 2] === undefined || vs[j + 2] === undefined || vs[k + 2] === undefined)) { sum += triVol(vs[i], vs[i + 1], vs[i + 2], vs[j], vs[j + 1], vs[j + 2], vs[k], vs[k + 1], vs[k + 2]); tris++ }
        }
        objs[key] = { vol: Math.abs(sum), tris }
      } else {
        objs[key] = { comps: [...body.matchAll(/<component\b([^>]*?)\/?>/g)].map((c) => { const a = attrs(c[1]); return { file: a['p:path'] ? (a['p:path'].startsWith('/') ? a['p:path'] : '/' + a['p:path']) : file, id: a.objectid, det: detOf(a.transform) } }) }
      }
    }
  }
  const volOf = (key, depth = 0) => {
    const o = objs[key]; if (!o || depth > 8) return { v: 0, t: 0 }
    if (o.vol !== undefined) return { v: o.vol, t: o.tris }
    return o.comps.reduce((s, c) => { const r = volOf(`${c.file}#${c.id}`, depth + 1); return { v: s.v + r.v * c.det, t: s.t + r.t } }, { v: 0, t: 0 })
  }
  const build = (files[main].match(/<build\b[^>]*>([\s\S]*?)<\/build>/) || [])[1]
  let total = 0, tris = 0
  const items = build ? [...build.matchAll(/<item\b([^>]*?)\/?>/g)].map((m) => attrs(m[1])) : []
  if (items.length) for (const a of items) { const r = volOf(`${a['p:path'] ? (a['p:path'].startsWith('/') ? a['p:path'] : '/' + a['p:path']) : main}#${a.objectid}`); total += r.v * detOf(a.transform); tris += r.t }
  else for (const k of Object.keys(objs)) { const r = volOf(k); total += r.v; tris += r.t }
  if (!total) throw new Error('Không đọc được hình học trong file 3MF')
  return { format: '3MF', volumeMm3: total * unit ** 3, triangles: tris, size: null }
}

/** Trả về { format, volumeCm3, triangles, size:[x,y,z]|null }. Ném Error tiếng Việt nếu file hỏng. */
export async function analyzeMesh(buf, name = '') {
  const ext = name.toLowerCase().split('.').pop(), head = new Uint8Array(buf.slice(0, 4))
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  if (ext === '3mf' && !isZip) throw new Error('File .3mf không đúng định dạng')
  const r = ext === '3mf' || isZip ? await threeMF(buf) : stl(buf)
  return { format: r.format, volumeCm3: r.volumeMm3 / 1000, triangles: r.triangles, size: r.size }
}

export const DENSITY = { PLA: 1.24, PETG: 1.27, ABS: 1.04 } // g/cm³
export const LAYER_HEIGHTS = ['0.12', '0.16', '0.2', '0.28']
const RATE = { '0.12': 6, '0.16': 8, '0.2': 10, '0.28': 14 } // gram nhựa in được mỗi giờ (ước lượng trung bình)
/** Ước tính khối lượng + thời gian in. Vỏ/lớp ngoài coi như ~35% thể tích, phần còn lại theo infill. */
export function estimatePrint({ volumeCm3, material, infill, layerHeight }) {
  const grams = volumeCm3 * DENSITY[material] * (0.35 + 0.65 * (infill / 100))
  return { grams: Math.max(1, Math.round(grams * 10) / 10), hours: Math.max(0.25, Math.round((grams / RATE[layerHeight]) * 10) / 10) }
}
