// Đọc & kiểm tra file STL / 3MF ngay trên trình duyệt (không gửi file đi đâu để phân tích).
// Trả về: { kind, triangles, volumeCm3, dims:[x,y,z] (mm), warnings:[] }. Ném lỗi (Error) nếu file không hợp lệ.
export const MAX_BYTES = 50 * 1024 * 1024
export const ALLOWED = /\.(stl|3mf)$/i
const MAX_UNZIPPED = 300 * 1024 * 1024 // chống zip bomb: 3MF giải nén tối đa 300MB

export const safeName = (n) => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(-100) || 'model'

/** Kiểm tra cơ bản trước khi đọc: đuôi file, dung lượng, chữ ký (magic bytes) */
export async function validateFile(file) {
  if (!file) throw new Error('Chưa chọn file')
  if (!ALLOWED.test(file.name)) throw new Error('Chỉ nhận file .STL hoặc .3MF')
  if (file.size === 0) throw new Error('File rỗng')
  if (file.size > MAX_BYTES) throw new Error(`File quá lớn (${(file.size / 1048576).toFixed(1)} MB). Tối đa 50 MB`)
  const head = new Uint8Array(await file.slice(0, 84).arrayBuffer())
  const is3mf = /\.3mf$/i.test(file.name)
  if (is3mf) { if (!(head[0] === 0x50 && head[1] === 0x4b)) throw new Error('File .3MF không hợp lệ (không phải gói ZIP)'); return '3mf' }
  if (head.length < 84 && !new TextDecoder().decode(head).trimStart().toLowerCase().startsWith('solid')) throw new Error('File .STL không hợp lệ')
  return 'stl'
}

const stats = () => ({ v6: 0, n: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] })
function addTri(s, a, b, c) {
  s.v6 += a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0]); s.n++
  for (const p of [a, b, c]) for (let i = 0; i < 3; i++) { if (p[i] < s.min[i]) s.min[i] = p[i]; if (p[i] > s.max[i]) s.max[i] = p[i] }
}
const finish = (kind, s, scale = 1, warnings = []) => {
  if (!s.n) throw new Error('Không đọc được mô hình 3D trong file (không có tam giác nào)')
  const dims = s.min.map((m, i) => (s.max[i] - m) * scale)
  if (![...dims].every(Number.isFinite) || dims.some((d) => d <= 0)) throw new Error('Mô hình bị lỗi (kích thước không hợp lệ)')
  const volMm3 = (Math.abs(s.v6) / 6) * scale ** 3
  if (!(volMm3 > 0)) warnings.push('Mô hình có thể không kín (thể tích bằng 0) nên khối lượng chỉ là ước lượng thô.')
  return { kind, triangles: s.n, volumeCm3: volMm3 / 1000, dims, warnings }
}

function parseStl(buf) {
  const dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0, s = stats()
  if (buf.byteLength === 84 + n * 50 && n > 0) { // STL nhị phân
    for (let t = 0; t < n; t++) {
      const o = 84 + t * 50 + 12, f = (k) => dv.getFloat32(o + k * 4, true)
      const a = [f(0), f(1), f(2)], b = [f(3), f(4), f(5)], c = [f(6), f(7), f(8)]
      if (![...a, ...b, ...c].every(Number.isFinite)) throw new Error('File STL chứa dữ liệu hỏng')
      addTri(s, a, b, c)
    }
    return finish('stl', s)
  }
  const txt = new TextDecoder().decode(buf) // STL ASCII
  if (!/^\s*solid/i.test(txt) || !/facet/i.test(txt)) throw new Error('File .STL không hợp lệ hoặc bị lỗi')
  const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g, pts = []
  let m
  while ((m = re.exec(txt))) pts.push([+m[1], +m[2], +m[3]])
  if (pts.length < 3 || pts.length % 3) throw new Error('File STL ASCII bị lỗi (số đỉnh không khớp)')
  for (let i = 0; i < pts.length; i += 3) addTri(s, pts[i], pts[i + 1], pts[i + 2])
  return finish('stl', s)
}

/* ---------- 3MF = ZIP chứa 3D/3dmodel.model (XML) ---------- */
async function unzipModels(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf)
  let e = buf.byteLength - 22
  for (; e >= Math.max(0, buf.byteLength - 66000); e--) if (dv.getUint32(e, true) === 0x06054b50) break
  if (e < 0 || dv.getUint32(e, true) !== 0x06054b50) throw new Error('File .3MF bị lỗi (không đọc được danh mục ZIP)')
  const count = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = []
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true)
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl
    if (!/\.model$/i.test(name)) continue
    if (usize > MAX_UNZIPPED) throw new Error('File .3MF giải nén quá lớn')
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = u8.subarray(start, start + csize)
    let data
    if (method === 0) data = raw
    else if (method === 8 && typeof DecompressionStream !== 'undefined') data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer())
    else throw new Error('Trình duyệt này không giải nén được file .3MF – hãy nhập khối lượng thủ công')
    out.push([name, new TextDecoder().decode(data)])
  }
  if (!out.length) throw new Error('File .3MF không chứa mô hình 3D')
  return out
}
const UNIT = { micron: 0.001, millimeter: 1, centimeter: 10, meter: 1000, inch: 25.4, foot: 304.8 }
const parseT = (t) => { const a = String(t || '').trim().split(/\s+/).map(Number); return a.length === 12 && a.every(Number.isFinite) ? a : [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }
const mul = (a, b) => { // a áp dụng trước, b áp dụng sau (quy ước hàng của 3MF)
  const r = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
  for (let j = 0; j < 3; j++) r[9 + j] = a[9] * b[j] + a[10] * b[3 + j] + a[11] * b[6 + j] + b[9 + j]; return r
}
const apply = (m, p) => [p[0] * m[0] + p[1] * m[3] + p[2] * m[6] + m[9], p[0] * m[1] + p[1] * m[4] + p[2] * m[7] + m[10], p[0] * m[2] + p[1] * m[5] + p[2] * m[8] + m[11]]

async function parse3mf(buf) {
  const docs = await unzipModels(buf), objs = new Map(), warnings = []
  let unit = 1, items = []
  for (const [name, xml] of docs) {
    const d = new DOMParser().parseFromString(xml, 'application/xml')
    if (d.querySelector('parsererror')) throw new Error('File .3MF bị lỗi (XML không đọc được)')
    const root = d.documentElement
    if (/^3D\/3dmodel\.model$/i.test(name)) { unit = UNIT[root.getAttribute('unit') || 'millimeter'] || 1 }
    for (const o of d.getElementsByTagName('object')) {
      const id = (name.toLowerCase().includes('3dmodel.model') ? '' : name + ':') + o.getAttribute('id'), mesh = o.getElementsByTagName('mesh')[0]
      if (mesh) {
        const vs = [...mesh.getElementsByTagName('vertex')].map((v) => [+v.getAttribute('x'), +v.getAttribute('y'), +v.getAttribute('z')])
        const ts = [...mesh.getElementsByTagName('triangle')].map((t) => [+t.getAttribute('v1'), +t.getAttribute('v2'), +t.getAttribute('v3')])
        objs.set(id, { vs, ts })
      } else objs.set(id, { comps: [...o.getElementsByTagName('component')].map((c) => ({ id: c.getAttribute('objectid'), t: parseT(c.getAttribute('transform')) })) })
    }
    if (/^3D\/3dmodel\.model$/i.test(name)) items = [...d.getElementsByTagName('item')].map((i) => ({ id: i.getAttribute('objectid'), t: parseT(i.getAttribute('transform')) }))
  }
  const s = stats()
  const walk = (id, t, depth) => {
    if (depth > 8) return
    const o = objs.get(id); if (!o) return
    if (o.comps) return o.comps.forEach((c) => walk(c.id, mul(c.t, t), depth + 1))
    const pts = o.vs.map((v) => apply(t, v))
    for (const [a, b, c] of o.ts) { if (!pts[a] || !pts[b] || !pts[c]) throw new Error('File .3MF chứa tam giác tham chiếu sai đỉnh'); addTri(s, pts[a], pts[b], pts[c]) }
  }
  if (!items.length) { warnings.push('Không thấy danh sách build, đã gộp mọi đối tượng trong file.'); [...objs.keys()].forEach((k) => objs.get(k).vs && walk(k, parseT(''), 0)) }
  else items.forEach((i) => walk(i.id, i.t, 0))
  return finish('3mf', s, unit, warnings)
}

/** Phân tích file → thông tin mô hình. Tối đa 50MB nên chạy được trên điện thoại; lỗi thì ném Error có thông báo tiếng Việt */
export async function analyzeModel(file) {
  const kind = await validateFile(file), buf = await file.arrayBuffer()
  return kind === '3mf' ? parse3mf(buf) : parseStl(buf)
}
